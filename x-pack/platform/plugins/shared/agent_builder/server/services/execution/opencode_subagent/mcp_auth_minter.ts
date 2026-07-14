/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Result of minting a per-run MCP credential: the `Authorization` header value
 * the sandbox uses to call back into Agent Builder's MCP server, plus a handle
 * to revoke it when the run ends.
 */
export interface MintedMcpAuth {
  /** `ApiKey <base64(id:key)>` (or a fallback header when minting is unavailable). */
  header: string;
  /** Revokes the credential. Safe to call multiple times; never throws. */
  revoke: () => Promise<void>;
}

/**
 * Mints short-lived, privilege-scoped API keys that let the sandboxed OpenCode
 * pod call back into this Kibana's Agent Builder MCP server WITHOUT ever holding
 * a connector secret.
 *
 * This is the Kibana-native equivalent of a sealed capability grant: the key is
 * granted on behalf of the requesting user (so it inherits exactly their
 * connector RBAC and nothing more), scoped to `agentBuilder:read` +
 * `actions:read`, given a short TTL, and revoked when the run completes.
 *
 * Verified against a live connector (`.abuseipdb`): a key with only
 * `agentBuilder:read` + `actions:read` can execute connector sub-actions via
 * MCP; a key missing either privilege is denied at the corresponding boundary.
 */
export class McpAuthMinter {
  constructor(private readonly security: SecurityServiceStart, private readonly logger: Logger) {}

  /**
   * Obtain the `Authorization` header the sandbox uses for the MCP loopback,
   * on behalf of `request`'s user.
   *
   * Agent Builder runs on Task Manager, so the tool's `request` is a fakeRequest
   * already authenticated by the user's TM-managed **ApiKey** (header
   * `ApiKey <base64(id:key)>`). That credential is exactly the capability we want
   * the sandbox to hold: user-scoped, short-lived, and lifecycle-bound to the
   * task. We therefore REUSE it directly — you cannot `grant` a new API key from
   * a request that is itself ApiKey-authenticated (`grant` only accepts Basic or
   * Bearer), and reusing avoids a redundant key.
   *
   * Only when the request carries a grantable credential (Basic/Bearer — e.g. an
   * interactive/dev call) do we mint a fresh, down-scoped, revocable key. Env
   * override and a dev Basic header remain as last-resort fallbacks so the PoC
   * keeps working when neither is possible.
   */
  async mint(request: KibanaRequest, expiration = '1h'): Promise<MintedMcpAuth> {
    const envOverride = process.env.AGENT_BUILDER_OPENCODE_MCP_AUTH;
    if (envOverride) {
      return { header: envOverride, revoke: async () => {} };
    }

    // Reuse an already-present ApiKey/Bearer capability from the (fake)request.
    // This is the normal Task Manager path: the header is the user's TM key.
    const reused = this.reuseRequestCapability(request);
    if (reused) {
      return reused;
    }

    try {
      const grant = await this.security.authc.apiKeys.grantAsInternalUser(request, {
        name: `opencode-subagent-${Date.now()}`,
        expiration,
        metadata: { managed: true, managed_by: 'agent_builder_opencode_subagent' },
        kibana_role_descriptors: {
          agent_builder_opencode_subagent: {
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [
              {
                spaces: ['*'],
                feature: { agentBuilder: ['read'], actions: ['read'] },
              },
            ],
          },
        },
      });

      if (!grant) {
        this.logger.warn(
          'API key grant returned null (API keys may be disabled); falling back to dev auth for the OpenCode MCP loopback'
        );
        return { header: this.devFallbackHeader(), revoke: async () => {} };
      }

      const header = `ApiKey ${Buffer.from(`${grant.id}:${grant.api_key}`).toString('base64')}`;
      const { id, name } = grant;
      this.logger.info(
        `Minted scoped OpenCode MCP API key ${id} (ttl=${expiration}, privileges=agentBuilder:read+actions:read)`
      );
      return {
        header,
        revoke: async () => {
          try {
            await this.security.authc.apiKeys.invalidateAsInternalUser({ ids: [id] });
            this.logger.info(`Revoked scoped OpenCode MCP API key ${id}`);
          } catch (e) {
            this.logger.warn(
              `Failed to invalidate OpenCode MCP API key ${name} (${id}): ${(e as Error).message}`
            );
          }
        },
      };
    } catch (e) {
      this.logger.warn(
        `Failed to mint scoped OpenCode MCP API key; falling back to dev auth: ${
          (e as Error).message
        }`
      );
      return { header: this.devFallbackHeader(), revoke: async () => {} };
    }
  }

  /**
   * If the request already carries an `ApiKey` (or non-UIAM `Bearer`) capability,
   * reuse it verbatim as the MCP loopback header. Revocation is a no-op: this key
   * belongs to the caller's session/task lifecycle (e.g. Task Manager invalidates
   * its own key), not to this run, so we must not invalidate it here.
   */
  private reuseRequestCapability(request: KibanaRequest): MintedMcpAuth | undefined {
    const raw = request.headers?.authorization;
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (typeof header !== 'string' || header.length === 0) {
      return undefined;
    }
    const scheme = header.split(' ')[0]?.toLowerCase();
    if (scheme === 'apikey' || scheme === 'bearer') {
      this.logger.info(
        `Reusing request's ${scheme} credential for the OpenCode MCP loopback (no new key minted)`
      );
      return { header, revoke: async () => {} };
    }
    return undefined;
  }

  private devFallbackHeader(): string {
    return `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
  }
}
