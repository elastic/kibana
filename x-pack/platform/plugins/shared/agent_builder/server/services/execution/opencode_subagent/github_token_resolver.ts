/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';
import { GithubAppTokenMinter } from './github_app_token_minter';

const GITHUB_ACTION_TYPE_ID = '.github';
const ACTION_SAVED_OBJECT_TYPE = 'action';
const GITHUB_APP_AUTH_TYPE = 'github_app';

interface RawActionAttributes {
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface GithubTokenResolverResult {
  token: string;
  connectorId: string;
}

export type GitHubTokenAccess = 'read' | 'push-pr';

interface ConnectorMaterial {
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

type ScopedActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

const parseAllowedRepos = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim());
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeRepo = (repo: string): string =>
  repo
    .trim()
    .replace(/\.git$/i, '')
    .toLowerCase();

const isRepoAllowed = (repo: string, allowedRepos: string[]): boolean => {
  const normalizedRepo = normalizeRepo(repo);
  return allowedRepos.some((allowed) => {
    const normalizedAllowed = normalizeRepo(allowed);
    if (normalizedAllowed.endsWith('/*')) {
      return normalizedRepo.startsWith(`${normalizedAllowed.slice(0, -1)}`);
    }
    return normalizedRepo === normalizedAllowed;
  });
};

const firstConcreteRepo = (repos: string[]): string | undefined =>
  repos.filter((repo) => !repo.endsWith('/*'))[0];

const uniqueRepos = (repos: string[]): string[] => [...new Set(repos.filter(Boolean))];

const formatRepoCandidates = (repos: string[]): string =>
  uniqueRepos(repos).length > 0 ? uniqueRepos(repos).join(', ') : 'none';

/**
 * Resolves a GitHub connector credential (decrypted, server-side) so the
 * executor can inject a git-usable token into the sandbox for real clone/push
 * operations.
 *
 * This is a deliberate, narrowly-scoped exception to the "secrets never enter the
 * sandbox" rule: raw git operations (unlike API calls brokered over the MCP
 * loopback) require a git-usable credential inside the pod. The token is injected
 * per-run and scrubbed afterwards by the runtime. Prefer GitHub App auth, which
 * mints a short-lived installation token scoped to the sandbox profile's repos.
 * Bearer/PAT auth is retained for existing connectors.
 */
export class GithubTokenResolver {
  constructor(
    private readonly getActions: () => Promise<ActionsPluginStart>,
    private readonly encryptedSavedObjects: EncryptedSavedObjectsPluginStart,
    private readonly logger: Logger
  ) {}

  /**
   * Given the connector ids allowed for this run, find the first `.github`
   * connector and return a git-usable token. If no connector was explicitly
   * attached, fall back to GitHub connectors the current user can access. Returns
   * `undefined` when there is no usable GitHub connector or resolution fails —
   * callers should treat a missing token as "no git credentials for this run".
   */
  async resolve({
    request,
    allowedConnectors,
    spaceId,
    gitRepos,
    requestedRepo,
    access,
    requireRequestedRepo,
    onDiagnostic,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    spaceId?: string;
    gitRepos?: string[];
    requestedRepo?: string;
    access?: GitHubTokenAccess;
    requireRequestedRepo?: boolean;
    onDiagnostic?: (message: string) => void;
  }): Promise<GithubTokenResolverResult | undefined> {
    try {
      const actions = await this.getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connectorIds = await this.resolveGithubConnectorIds(actionsClient, allowedConnectors);
      if (connectorIds.length === 0) {
        onDiagnostic?.('No accessible GitHub connector was found');
      }

      for (const connectorId of connectorIds) {
        // `get` enforces the user's `actions:get` RBAC and gives us the type.
        const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
        if (!connector || connector.actionTypeId !== GITHUB_ACTION_TYPE_ID) {
          continue;
        }

        const material = await this.readConnectorMaterial({
          connectorId,
          isPreconfigured: actionsClient.isPreconfigured(connectorId),
          actions,
          spaceId,
        });
        const credential = await this.resolveFromConnector({
          connectorId,
          material,
          gitRepos,
          requestedRepo,
          access,
          requireRequestedRepo,
          onDiagnostic,
        });
        if (credential) {
          return credential;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve GitHub connector token: ${(error as Error).message}. ` +
          `The sandbox will run without git credentials.`
      );
      onDiagnostic?.(`Failed to resolve GitHub connector token: ${(error as Error).message}`);
    }

    return undefined;
  }

  private async resolveGithubConnectorIds(
    actionsClient: ScopedActionsClient,
    allowedConnectors?: string[]
  ): Promise<string[]> {
    if (allowedConnectors && allowedConnectors.length > 0) {
      return allowedConnectors;
    }

    const connectors = await actionsClient.getAll();
    return connectors
      .filter((connector) => connector.actionTypeId === GITHUB_ACTION_TYPE_ID)
      .map((connector) => connector.id);
  }

  private async readConnectorMaterial({
    connectorId,
    isPreconfigured,
    actions,
    spaceId,
  }: {
    connectorId: string;
    isPreconfigured: boolean;
    actions: ActionsPluginStart;
    spaceId?: string;
  }): Promise<ConnectorMaterial> {
    let config: Record<string, unknown> | undefined;
    let secrets: Record<string, unknown> | undefined;

    if (isPreconfigured) {
      const inMemory = actions.inMemoryConnectors.find(
        (c: InMemoryConnector) => c.id === connectorId
      );
      config = inMemory?.config as Record<string, unknown> | undefined;
      secrets = inMemory?.secrets as Record<string, unknown> | undefined;
    } else {
      const esoClient = this.encryptedSavedObjects.getClient({
        includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
      });
      const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;
      const raw = await esoClient.getDecryptedAsInternalUser<RawActionAttributes>(
        ACTION_SAVED_OBJECT_TYPE,
        connectorId,
        namespace ? { namespace } : {}
      );
      config = raw.attributes.config;
      secrets = raw.attributes.secrets;
    }

    return { config, secrets };
  }

  private async resolveFromConnector({
    connectorId,
    material,
    gitRepos,
    requestedRepo,
    access,
    requireRequestedRepo,
    onDiagnostic,
  }: {
    connectorId: string;
    material: ConnectorMaterial;
    gitRepos?: string[];
    requestedRepo?: string;
    access?: GitHubTokenAccess;
    requireRequestedRepo?: boolean;
    onDiagnostic?: (message: string) => void;
  }): Promise<GithubTokenResolverResult | undefined> {
    const { config, secrets } = material;
    if (!secrets) return undefined;

    if (secrets.authType === 'bearer' && typeof secrets.token === 'string') {
      this.logger.info(
        `Resolved GitHub PAT from connector ${connectorId} for sandbox git operations`
      );
      return { token: secrets.token, connectorId };
    }

    if (secrets.authType !== GITHUB_APP_AUTH_TYPE) {
      return undefined;
    }

    const appId = typeof secrets.appId === 'string' ? secrets.appId : undefined;
    const privateKey = typeof secrets.privateKey === 'string' ? secrets.privateKey : undefined;
    if (!appId || !privateKey) {
      const message = `GitHub App connector ${connectorId} is missing appId or privateKey`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    const repos = gitRepos ?? [];
    const allowedRepos = parseAllowedRepos(config?.allowedRepos);
    const candidateRepos = uniqueRepos([...allowedRepos, ...repos]);

    if (requireRequestedRepo && !requestedRepo) {
      const message = `GitHub App connector ${connectorId} needs a specific repository before minting a token. Candidate repos: ${formatRepoCandidates(
        candidateRepos
      )}`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    const repo = requestedRepo ?? firstConcreteRepo(allowedRepos) ?? firstConcreteRepo(repos);

    if (!repo) {
      const message = `GitHub App connector ${connectorId} requires a requested repo or allowedRepos config to mint an installation token`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    if (allowedRepos.length > 0 && !isRepoAllowed(repo, allowedRepos)) {
      const message = `GitHub App connector ${connectorId} is not allowed to mint a token for ${repo}. Allowed repos: ${formatRepoCandidates(
        allowedRepos
      )}`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      const message = `GitHub App connector ${connectorId} received invalid repo "${repo}"`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    if (!access) {
      const message = `GitHub App connector ${connectorId} requires sandbox git mode to mint an installation token`;
      this.logger.warn(message);
      onDiagnostic?.(message);
      return undefined;
    }

    const permissions: Record<string, string> =
      access === 'push-pr' ? { contents: 'write', pull_requests: 'write' } : { contents: 'read' };

    const minted = await new GithubAppTokenMinter(
      { appId, privateKeyPem: privateKey },
      this.logger.get(`githubAppConnector.${connectorId}`)
    ).mintForAccount(owner, {
      repositories: [repoName],
      permissions,
    });

    this.logger.info(
      `Minted GitHub App installation token from connector ${connectorId} for ${repo}`
    );
    return { token: minted.token, connectorId: `github-app-connector:${connectorId}` };
  }
}
