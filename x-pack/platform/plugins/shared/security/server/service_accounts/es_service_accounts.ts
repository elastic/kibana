/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { CreateServiceAccountServerParams, ServiceAccount } from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { bestEffortUserProfileIdResolver, resolveWorkloadBinder } from './bindings';
import { ensureClusterPrivilege } from './cluster_privilege';
import { parseCreateServiceAccountParams } from './create_params';
import type { ServiceAccountCredentialStore } from './credentials';
import type { EsServiceAccountPrincipal } from './es_service_account_id';
import { parseEsServiceAccountId } from './es_service_account_id';
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';
import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS, ServiceAccountFakeRequests } from './fake_requests';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import type { ListServiceAccountsParams, ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import type {
  ListServiceAccountsResponse,
  ServiceAccountDirectoryEntry,
} from '../../common/service_accounts';
import {
  ES_SERVICE_ACCOUNT_FALLBACK_ROLE,
  ES_SERVICE_ACCOUNT_NAMESPACE,
  ES_SERVICE_ACCOUNT_TOKEN_NAME,
  SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
  serviceAccountRolesSchema,
} from '../../common/service_accounts';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import { securityTelemetry } from '../otel/instrumentation';

/**
 * The discriminator on an account Elasticsearch reports, which decides whether the account is one
 * Kibana manages at all.
 */
const userManagedEntrySchema = z.object({ type: z.literal('user_managed') });

/**
 * The rest of what Elasticsearch reports for an account keyed by its `{namespace}/{service}`
 * principal. Parsed separately from the discriminator above, so "this is not Kibana's account"
 * and "Kibana cannot read this account" stay different answers.
 *
 * Shape only, matching what {@link list} takes from the query API. The caps Kibana puts on a
 * create are its own and Elasticsearch enforces none of them, so an account created outside
 * Kibana may hold more roles, or longer role names, than Kibana would ever have written. Holding
 * a read to the bounds of a write would let such an account list cleanly and then fail to open.
 */
const accountEntrySchema = z.object({
  roles: z.array(z.string()),
  enabled: z.boolean(),
});

/**
 * One account as the query API reports it. Unlike the keyed GET response, the principal is a
 * `username` field on each item. The API only ever returns user-managed accounts.
 */
interface QueriedServiceAccount {
  username: string;
  roles: string[];
  enabled: boolean;
}

/** An Elasticsearch user-managed service account, as Elasticsearch reports it. */
interface ElasticsearchServiceAccount {
  id: string;
  name: string;
  namespace: string;
  roles: string[];
  enabled: boolean;
}

/** Narrows an account to the directory entry. */
const toDirectoryEntry = (
  { id, name, roles, enabled }: ElasticsearchServiceAccount,
  assumable: boolean
): ServiceAccountDirectoryEntry => ({
  id,
  name,
  roles,
  enabled,
  assumable,
});

export interface EsServiceAccountsOptions {
  logger: Logger;
  requestLifetimeMs: number;
  license: SecurityLicense;
  clusterClient: IClusterClient;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  credentialStore: ServiceAccountCredentialStore;
  /** Whether saved object encryption is possible; without it the token cannot be stored. */
  canEncrypt: boolean;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
}

/**
 * Elasticsearch-backed service accounts, used when UIAM is not available.
 *
 * Creating an account also mints the one long-lived service account token Kibana manages for it
 * and stores that token encrypted. The token never leaves the security plugin: consumers are
 * handed a short-lived token exchanged from it.
 */
export class EsServiceAccounts implements ServiceAccountsBackend {
  private readonly fakeRequests: ServiceAccountFakeRequests;
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly clusterClient: IClusterClient;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly credentialStore: ServiceAccountCredentialStore;
  private readonly canEncrypt: boolean;
  private readonly getCurrentUser: EsServiceAccountsOptions['getCurrentUser'];
  private readonly getCurrentUserProfileId: EsServiceAccountsOptions['getCurrentUserProfileId'];

  constructor({
    logger,
    requestLifetimeMs,
    license,
    clusterClient,
    checkPrivilegesWithRequest,
    credentialStore,
    canEncrypt,
    getCurrentUser,
    getCurrentUserProfileId,
  }: EsServiceAccountsOptions) {
    this.logger = logger;
    this.license = license;
    this.clusterClient = clusterClient;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.credentialStore = credentialStore;
    this.canEncrypt = canEncrypt;
    this.getCurrentUser = getCurrentUser;
    this.getCurrentUserProfileId = getCurrentUserProfileId;
    this.fakeRequests = new ServiceAccountFakeRequests(
      logger,
      (serviceAccountId) => this.exchangeToken(serviceAccountId),
      requestLifetimeMs
    );
  }

  async authorize(request: KibanaRequest): Promise<void> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot use a service account: security features are disabled in Elasticsearch'
      );
    }

    await ensureManageSecurityPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      action: 'use a service account',
    });
  }

  async create(
    request: KibanaRequest,
    params: CreateServiceAccountServerParams
  ): Promise<ServiceAccount> {
    try {
      const account = await this.createAccount(request, params);
      securityTelemetry.recordServiceAccountCreationAttempt({
        outcome: 'success',
        serviceAccountBackend: 'stack',
      });
      return account;
    } catch (e) {
      securityTelemetry.recordServiceAccountCreationAttempt({
        outcome: 'failure',
        serviceAccountBackend: 'stack',
      });
      throw e;
    }
  }

  private async createAccount(
    request: KibanaRequest,
    params: CreateServiceAccountServerParams
  ): Promise<ServiceAccount> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot create a service account: security features are disabled in Elasticsearch'
      );
    }

    if (!this.canEncrypt) {
      throw Boom.failedDependency(
        'Cannot create a service account: `xpack.encryptedSavedObjects.encryptionKey` is not ' +
          'configured, so the account credential cannot be stored securely'
      );
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'manage_security',
      action: 'create a service account',
    });

    const user = this.getCurrentUser(request);
    if (!user) {
      throw Boom.unauthorized('Cannot create a service account: the request is not authenticated');
    }

    const namespace = ES_SERVICE_ACCOUNT_NAMESPACE;
    // The schema refuses an empty `roles` rather than letting it fall through to the derivation
    // below, which would answer an explicit "no roles" with the widest possible grant.
    if (params.trustedPlatformAssumers?.length) {
      throw Boom.badRequest(
        'Cannot create a service account: platform assumers are not supported on this deployment.'
      );
    }

    const { name, roles: requestedRoles } = parseCreateServiceAccountParams(params);
    const serviceAccountId = `${namespace}/${name}`;

    const roles = requestedRoles ?? this.deriveRoles(user, serviceAccountId);

    const esClient = this.clusterClient.asScoped(request).asCurrentUser;

    // Elasticsearch's PUT is a full replacement: writing over an existing account would silently
    // reset its roles and re-enable it. Creating is therefore refused outright for a name that is
    // taken. The check and the write are not atomic; concurrent creates of one name are a narrow,
    // accepted race.
    if (await this.readAccount(esClient, namespace, name)) {
      throw Boom.conflict(`A service account named [${name}] already exists`);
    }

    this.logger.debug(`Attempting to create service account [${serviceAccountId}]`);

    try {
      await esClient.transport.request({
        method: 'PUT',
        path: `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        body: { roles },
        querystring: { refresh: 'wait_for' },
      });
    } catch (e) {
      await this.reconcileFailedAccountWrite(esClient, namespace, name);
      this.logger.error(
        `Failed to create service account [${serviceAccountId}]: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }

    try {
      const token = await this.createToken(esClient, namespace, name);

      await this.credentialStore.set({
        serviceAccountId,
        namespace,
        name,
        tokenName: ES_SERVICE_ACCOUNT_TOKEN_NAME,
        createdAt: new Date().toISOString(),
        createdBy: await resolveWorkloadBinder(
          user,
          bestEffortUserProfileIdResolver(this.getCurrentUserProfileId, request, this.logger)
        ),
        token,
      });
    } catch (e) {
      // The account and any token it already has are Kibana's to clean up: leaving behind a
      // credential Kibana cannot reach would be worse than the failure that got us here.
      await this.rollback(esClient, namespace, name);
      this.logger.error(
        `Failed to create service account [${serviceAccountId}]: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }
    return { id: serviceAccountId, name };
  }

  /**
   * The roles a new account gets when the caller named none: the creator's own, or the fallback
   * role when the creator reports none, as an API-key authentication does.
   *
   * The creator's roles are held to the same bounds as an explicit `roles`, so that an account
   * Kibana fills in for is never given something a caller could not have asked for by name.
   */
  private deriveRoles(user: AuthenticatedUser, serviceAccountId: string): string[] {
    if (user.roles.length === 0) {
      this.logger.warn(
        `No roles could be derived for service account [${serviceAccountId}] from the current ` +
          `credentials, so it was granted [${ES_SERVICE_ACCOUNT_FALLBACK_ROLE}]. Specify \`roles\` ` +
          `explicitly to scope it down.`
      );
      return [ES_SERVICE_ACCOUNT_FALLBACK_ROLE];
    }

    const parsed = serviceAccountRolesSchema.safeParse(user.roles);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Cannot create a service account: the roles of the current user cannot be copied to it ` +
          `(${parsed.error.issues.map(({ message }) => message).join('; ')}). Specify \`roles\` ` +
          `explicitly.`
      );
    }

    return parsed.data;
  }

  /**
   * Lists every user-managed account in the cluster, whichever namespace it lives in, sorted by
   * principal. The cursor is the principal of the last account Elasticsearch reported for the
   * page, which `search_after` resumes from — the last one reported, not the last one returned,
   * so that an account this page skipped is stepped over rather than served again.
   *
   * Unlike {@link get}, a stored credential is taken at face value here. Confirming each one the
   * way {@link isAssumable} does would cost an Elasticsearch round trip per account, up to a
   * hundred of them on one page, so a listed account that was deleted and recreated outside
   * Kibana keeps a stale `assumable` until it is opened.
   */
  async list(
    request: KibanaRequest,
    { limit = SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE, after }: ListServiceAccountsParams = {}
  ): Promise<ListServiceAccountsResponse> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot list service accounts: security features are disabled in Elasticsearch'
      );
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'read_security',
      action: 'list service accounts',
    });

    const esClient = this.clusterClient.asScoped(request).asCurrentUser;

    // One more than the page, so that "is there another page" is answered by the same query
    // without trusting a total that a concurrent create could shift.
    const { service_accounts: rawAccounts } = await esClient.transport.request<{
      service_accounts: QueriedServiceAccount[];
    }>({
      method: 'POST',
      path: '/_security/_query/service',
      body: {
        size: limit + 1,
        sort: ['username'],
        ...(after !== undefined ? { search_after: [after] } : {}),
      },
    });

    // An account whose principal Kibana cannot split is skipped rather than taken as a reason to
    // refuse the page: an oddity in one account must not make the whole directory unreadable.
    const accounts = rawAccounts.slice(0, limit).flatMap(({ username, roles, enabled }) => {
      const principal = parseEsServiceAccountId(username);
      if (!principal) {
        this.logger.warn(
          `Skipping service account [${username}], which Elasticsearch reported with an unrecognized principal`
        );
        return [];
      }

      return [{ id: username, ...principal, roles, enabled }];
    });

    const credentialled = await this.credentialStore.findExisting(accounts.map(({ id }) => id));

    const serviceAccounts = accounts.map((account) =>
      toDirectoryEntry(account, credentialled.has(account.id))
    );

    if (rawAccounts.length <= limit) {
      return { serviceAccounts };
    }

    // The cursor comes off the raw page rather than the entries above, so that skipping an entry
    // cannot rewind paging over everything that followed it.
    return { serviceAccounts, nextPage: rawAccounts[limit - 1].username };
  }

  async get(request: KibanaRequest, id: string): Promise<ServiceAccountDirectoryEntry> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot get a service account: security features are disabled in Elasticsearch'
      );
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'read_security',
      action: 'get a service account',
    });

    // An id that is not `{namespace}/{service}` names no Elasticsearch account, so it is missing
    // rather than malformed.
    const principal = parseEsServiceAccountId(id);
    if (!principal) {
      throw Boom.notFound(`Service account [${id}] was not found`);
    }

    const esClient = this.clusterClient.asScoped(request).asCurrentUser;

    // Built-in accounts resolve to `undefined` here too, so `elastic/kibana` is a 404 rather
    // than a directory entry: they are not Kibana's to list or bind.
    const account = await this.readAccount(esClient, principal.namespace, principal.name);
    if (!account) {
      throw Boom.notFound(`Service account [${id}] was not found`);
    }

    const stored = (await this.credentialStore.findExisting([id])).has(id);
    return toDirectoryEntry(account, await this.isAssumable(esClient, principal, stored));
  }

  /**
   * Whether Kibana can act as this account, which on Elasticsearch means holding a token the
   * account still recognizes.
   *
   * A credential document is keyed by principal alone, so it outlives the account it was written
   * for: delete `namespace/name` through Elasticsearch and recreate it, and Kibana's document is
   * still there, holding a token that cannot authenticate the new account. Answering `true` off
   * the document alone would send a caller into an exchange that fails, so the account is asked
   * whether it still holds the token Kibana mints.
   *
   * Two limits worth knowing. An operator who recreates the account and then mints their own
   * token under Kibana's reserved name passes this check, because the name is all Elasticsearch
   * exposes. And a check that cannot be completed falls through to the stored document rather
   * than calling the account unassumable: `read_security` is enough to read an account's tokens,
   * so this is a transient failure rather than an authorization one, and one call that did not
   * land is weaker evidence than the record Kibana holds.
   */
  private async isAssumable(
    esClient: ElasticsearchClient,
    { namespace, name }: EsServiceAccountPrincipal,
    stored: boolean
  ): Promise<boolean> {
    // Ordered so that an account Kibana never created costs no extra round trip.
    if (!stored) {
      return false;
    }

    try {
      if (await this.hasManagedToken(esClient, namespace, name)) {
        return true;
      }
    } catch (e) {
      this.logger.debug(
        `Could not confirm the credential of service account [${namespace}/${name}], so the ` +
          `stored one was reported as it is: ${getDetailedErrorMessage(e)}`
      );
      return true;
    }

    this.logger.debug(
      `Service account [${namespace}/${name}] no longer holds a [${ES_SERVICE_ACCOUNT_TOKEN_NAME}] ` +
        `token, so the credential Kibana stored for it was not reported.`
    );
    return false;
  }

  async createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest> {
    return await this.fakeRequests.create(params);
  }

  async reauthenticateFakeRequest(
    request: KibanaRequest
  ): Promise<{ authorization: string } | null> {
    if (!this.fakeRequests.isServiceAccountRequest(request)) {
      return null;
    }

    try {
      const token = await this.fakeRequests.ensureFreshToken(
        request,
        SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS
      );
      return { authorization: `Bearer ${token}` };
    } catch {
      return null;
    }
  }

  releaseFakeRequest(request: KibanaRequest): void {
    this.fakeRequests.release(request);
  }

  private async exchangeToken(serviceAccountId: string): Promise<string> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot exchange a service account token: security features are disabled in Elasticsearch'
      );
    }
    if (!this.canEncrypt) {
      throw Boom.forbidden(
        'Cannot exchange a service account token: saved object encryption is not available. Set `xpack.encryptedSavedObjects.encryptionKey`.'
      );
    }

    const principal = parseEsServiceAccountId(serviceAccountId);
    if (
      !principal ||
      principal.namespace !== ES_SERVICE_ACCOUNT_NAMESPACE ||
      principal.name.length > SERVICE_ACCOUNT_NAME_MAX_LENGTH ||
      !SERVICE_ACCOUNT_NAME_REGEX.test(principal.name)
    ) {
      throw Boom.badRequest('Invalid Elasticsearch service account ID.');
    }

    try {
      const credential = await this.credentialStore.getDecrypted(serviceAccountId);
      if (!credential) {
        const errorMessage = `Unable to exchange token for service account [${serviceAccountId}]: missing stored credential`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }
      const mismatches = [
        ['serviceAccountId', serviceAccountId, credential.serviceAccountId],
        ['namespace', principal.namespace, credential.namespace],
        ['name', principal.name, credential.name],
        ['tokenName', ES_SERVICE_ACCOUNT_TOKEN_NAME, credential.tokenName],
      ]
        .filter(([, expected, actual]) => expected !== actual)
        .map(
          ([field, expected, actual]) =>
            `${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
      if (mismatches.length > 0) {
        this.logger.error(
          `Stored credential for service account [${serviceAccountId}] is inconsistent (${mismatches.join(
            '; '
          )}).`
        );
        throw Boom.forbidden('The stored service account credential is inconsistent.');
      }

      const response = await this.clusterClient.asInternalUser.security.getToken({
        // @ts-expect-error Elasticsearch client types do not yet include the `_user_managed_service_account` grant
        grant_type: '_user_managed_service_account',
        service_account_token: credential.token,
      });
      return response.access_token;
    } catch (error) {
      const cause =
        error instanceof Error ? error : new Error('Service account token exchange failed.');
      const retryDelay = getExchangeRetryDelay(cause);
      // Transport errors can contain the credential, so neither log them nor retain them as a cause.
      this.logger.error(
        `Failed to exchange service account [${serviceAccountId}] for an ephemeral token (${
          retryDelay === null ? 'terminal' : 'retryable'
        } failure)`
      );
      throw new ServiceAccountTokenExchangeError(
        new Error(`Service account token exchange failed for [${serviceAccountId}].`),
        retryDelay !== null,
        retryDelay ?? 0
      );
    }
  }

  /**
   * Reads the account back, resolving `undefined` when it does not exist, or when the principal
   * resolves to a built-in account: those are not Kibana's to manage, and must never be mistaken
   * for one it created.
   *
   * Throws when a user-managed account is there but Kibana cannot read it. The caller refuses a
   * taken name on the strength of this, and the Elasticsearch PUT behind it is a full
   * replacement, so "I cannot parse this" must never read as "the name is free".
   */
  private async readAccount(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<ElasticsearchServiceAccount | undefined> {
    const principal = `${namespace}/${name}`;

    const response = await esClient.transport.request<Record<string, unknown>>(
      {
        method: 'GET',
        path: `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        // Asked for explicitly, because the API's default depends on the shape of the path.
        // Kibana only ever manages user-managed accounts.
        querystring: { type: 'user_managed' },
      },
      // An unknown principal is an empty 200 rather than a 404. Ignore 404 as well, so a future
      // tightening upstream does not turn "no such account" into an error.
      { ignore: [404] }
    );

    const entry = response?.[principal];
    if (entry === undefined) {
      return undefined;
    }

    // The type filter above should keep built-in accounts out of the response. This is what holds
    // if it does not, and what makes a future third account type read as "not Kibana's" rather
    // than as unreadable.
    if (!userManagedEntrySchema.safeParse(entry).success) {
      this.logger.debug(`Service account [${principal}] is not a user-managed account`);
      return undefined;
    }

    const parsed = accountEntrySchema.safeParse(entry);
    if (!parsed.success) {
      // Refused rather than reported absent: this name belongs to an account Kibana manages, and
      // the caller would otherwise overwrite it.
      this.logger.error(
        `Elasticsearch reported service account [${principal}] in an unrecognized shape: ${parsed.error.message}`
      );
      throw Boom.badGateway(
        `Cannot determine the state of service account [${name}]: Elasticsearch reported it in an unrecognized shape.`
      );
    }

    return {
      id: principal,
      name,
      namespace,
      roles: parsed.data.roles,
      enabled: parsed.data.enabled,
    };
  }

  private async createToken(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<string> {
    const { token } = await esClient.transport.request<{ token: { value: string } }>({
      method: 'POST',
      path:
        `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}` +
        `/credential/token/${encodeURIComponent(ES_SERVICE_ACCOUNT_TOKEN_NAME)}`,
    });

    return token.value;
  }

  /**
   * Whether the account already holds the one token Kibana mints for it. The `nodes_credentials`
   * the same response carries are file-realm tokens an operator deployed, and Kibana only ever
   * mints through the API, so they are deliberately not consulted.
   */
  private async hasManagedToken(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<boolean> {
    const { tokens } = await esClient.transport.request<{ tokens: Record<string, unknown> }>({
      method: 'GET',
      path:
        `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}` +
        `/credential`,
    });

    return Object.hasOwn(tokens, ES_SERVICE_ACCOUNT_TOKEN_NAME);
  }

  /**
   * A rejected account write may still have landed, with only the response lost. Left alone that
   * strands an account with no token, and the pre-flight refuses that name on every retry that
   * follows.
   *
   * Elasticsearch records no owner on a user-managed account, so ownership is inferred. The
   * pre-flight found the name free moments ago, so an account here is either this call's or a
   * concurrent create's. The token tells them apart: this call failed before `createToken`, so a
   * token on the account came from the other create, and the account stays. Not the stored
   * credential, which can outlive its account and would have us strand the orphan we came for.
   *
   * What is left is a concurrent create that wrote the account but has not minted yet. Same race
   * the pre-flight already accepts, and that create rolls itself back.
   *
   * Best effort: the caller needs the error that got us here, not this one.
   */
  private async reconcileFailedAccountWrite(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<void> {
    const principal = `${namespace}/${name}`;

    try {
      if (!(await this.readAccount(esClient, namespace, name))) {
        return;
      }

      if (await this.hasManagedToken(esClient, namespace, name)) {
        this.logger.warn(
          `Service account [${principal}] is present after a failed create, but it already holds ` +
            `a [${ES_SERVICE_ACCOUNT_TOKEN_NAME}] token, so it was left in place.`
        );
        return;
      }
    } catch (e) {
      securityTelemetry.recordServiceAccountRollbackFailure({
        serviceAccountRollbackResource: 'account',
      });
      this.logger.error(
        `Could not determine whether the failed create of service account [${principal}] left an ` +
          `account behind. It may need to be removed manually: ${getDetailedErrorMessage(e)}`
      );
      return;
    }

    await this.rollback(esClient, namespace, name);
  }

  /**
   * Best effort: the error that triggered the rollback is the one the caller needs, so a failure
   * here is logged rather than thrown. An account left behind blocks re-creating that name until
   * an operator removes it, which is why the principal is named in the log.
   *
   * The deletes are attempted independently. A token Elasticsearch would not give up is the case
   * the forced account delete exists for, so it must not also be what stops it from running. The
   * credential is included because a rejected `set` does not prove Elasticsearch never committed
   * the document, but only once the account it belongs to is actually gone.
   */
  private async rollback(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<void> {
    const principal = `${namespace}/${name}`;

    try {
      await esClient.transport.request(
        {
          method: 'DELETE',
          path:
            `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}` +
            `/credential/token/${encodeURIComponent(ES_SERVICE_ACCOUNT_TOKEN_NAME)}`,
        },
        { ignore: [404] }
      );
    } catch (e) {
      securityTelemetry.recordServiceAccountRollbackFailure({
        serviceAccountRollbackResource: 'token',
      });
      this.logger.error(
        `Failed to delete the token of partially created service account [${principal}]: ` +
          getDetailedErrorMessage(e)
      );
    }

    let accountDeleted = false;
    try {
      // `force`, so the account still goes away if the token delete above did not land:
      // Elasticsearch refuses an unforced delete while any token remains.
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
          querystring: { force: 'true' },
        },
        { ignore: [404] }
      );
      accountDeleted = true;
    } catch (e) {
      securityTelemetry.recordServiceAccountRollbackFailure({
        serviceAccountRollbackResource: 'account',
      });
      this.logger.error(
        `Failed to roll back partially created service account [${principal}]. It may need to be ` +
          `removed manually: ${getDetailedErrorMessage(e)}`
      );
    }

    // While the account may still be alive, this credential is Kibana's one record of the token
    // it holds. Dropping that record is the one outcome worse than the failure that got us here,
    // so the credential outlives a rollback that could not finish.
    if (!accountDeleted) {
      return;
    }

    // The delete is idempotent, so the paths that never reached `set` cost nothing here.
    try {
      await this.credentialStore.delete(principal);
    } catch (e) {
      securityTelemetry.recordServiceAccountRollbackFailure({
        serviceAccountRollbackResource: 'credential',
      });
      this.logger.error(
        `Failed to delete the credential of partially created service account [${principal}]. ` +
          `It may need to be removed manually: ${getDetailedErrorMessage(e)}`
      );
    }
  }
}

const RETRYABLE_EXCHANGE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const getExchangeRetryDelay = (error: Error): number | null => {
  if (
    error instanceof errors.ConnectionError ||
    error instanceof errors.TimeoutError ||
    error instanceof errors.NoLivingConnectionsError
  ) {
    return 0;
  }
  if (!RETRYABLE_EXCHANGE_STATUSES.has(getErrorStatusCode(error))) {
    return null;
  }

  const headers = Boom.isBoom(error)
    ? error.output.headers
    : error instanceof errors.ResponseError
    ? error.headers
    : undefined;
  const retryAfter = headers?.['retry-after'];
  if (typeof retryAfter !== 'string' || retryAfter.trim() === '') {
    return 0;
  }
  const delay = /^\d+$/.test(retryAfter.trim())
    ? Number(retryAfter) * 1000
    : Date.parse(retryAfter) - Date.now();
  return Number.isFinite(delay) && delay > 0 ? delay : 0;
};
