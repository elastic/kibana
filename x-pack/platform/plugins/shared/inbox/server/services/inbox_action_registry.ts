/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InboxAction } from '@kbn/inbox-common';
import type {
  InboxActionProvider,
  InboxActionProviderListParams,
  InboxRequestContext,
} from './inbox_action_provider';

export interface InboxActionRegistryListParams extends InboxActionProviderListParams {
  sourceApp?: string;
  page: number;
  perPage: number;
}

export interface InboxActionRegistryListResult {
  actions: InboxAction[];
  total: number;
}

export interface UnknownInboxSourceAppError extends Error {
  readonly sourceApp: string;
}

export const isUnknownInboxSourceAppError = (error: unknown): error is UnknownInboxSourceAppError =>
  error instanceof Error && error.name === 'UnknownInboxSourceAppError';

const createUnknownInboxSourceAppError = (sourceApp: string): UnknownInboxSourceAppError => {
  const error = new Error(
    `No inbox action provider registered for sourceApp "${sourceApp}"`
  ) as UnknownInboxSourceAppError;
  error.name = 'UnknownInboxSourceAppError';
  (error as { sourceApp: string }).sourceApp = sourceApp;
  return error;
};

/**
 * Signals that an inbox action exists in our addressing scheme but is no
 * longer in a state that can accept a response — the underlying resource
 * (e.g. a workflow step) has already been advanced, cancelled, or
 * claimed by another responder.
 *
 * Provider implementations throw this so the framework can surface a
 * stable HTTP 409 Conflict back to the caller instead of a generic 500.
 * That, in turn, lets clients (UI, MCP, evals) distinguish "the action
 * is gone, refresh your inbox" from a real server error.
 *
 * Modeled as an `interface` + factory + type guard (rather than a
 * subclass) to mirror the colocated `UnknownInboxSourceAppError` and
 * keep this file under the `max-classes-per-file` lint cap.
 */
export interface InboxActionConflictError extends Error {
  readonly sourceApp: string;
  readonly sourceId: string;
}

export const isInboxActionConflictError = (error: unknown): error is InboxActionConflictError =>
  error instanceof Error && error.name === 'InboxActionConflictError';

export const createInboxActionConflictError = (
  sourceApp: string,
  sourceId: string,
  reason: string
): InboxActionConflictError => {
  const error = new Error(
    `Inbox action ${sourceApp}/${sourceId} can no longer accept a response: ${reason}`
  ) as InboxActionConflictError;
  error.name = 'InboxActionConflictError';
  (error as { sourceApp: string }).sourceApp = sourceApp;
  (error as { sourceId: string }).sourceId = sourceId;
  return error;
};

/**
 * Fan-out + merge-sort + paginate registry. Each registered provider owns a
 * `sourceApp` namespace and handles its own storage. The registry is
 * deliberately dumb — it does not persist actions itself; it's a routing
 * layer that consumers of `@kbn/inbox-common` never see.
 */
export class InboxActionRegistry {
  private readonly providers = new Map<string, InboxActionProvider>();

  constructor(private readonly logger: Logger) {}

  register(provider: InboxActionProvider): void {
    if (this.providers.has(provider.sourceApp)) {
      throw new Error(
        `An inbox action provider for sourceApp "${provider.sourceApp}" is already registered`
      );
    }
    this.providers.set(provider.sourceApp, provider);
    this.logger.debug(`Registered inbox action provider for sourceApp "${provider.sourceApp}"`);
  }

  has(sourceApp: string): boolean {
    return this.providers.has(sourceApp);
  }

  async list(
    params: InboxActionRegistryListParams,
    ctx: InboxRequestContext
  ): Promise<InboxActionRegistryListResult> {
    const { sourceApp, status, page, perPage } = params;
    const scoped = sourceApp ? this.providers.get(sourceApp) : undefined;
    const targetProviders = sourceApp
      ? scoped
        ? [scoped]
        : []
      : Array.from(this.providers.values());

    if (targetProviders.length === 0) {
      return { actions: [], total: 0 };
    }

    const results = await Promise.all(
      targetProviders.map(async (provider) => {
        try {
          const result = await provider.list({ status }, ctx);
          // Providers may report a pre-pagination `total` larger than the
          // number of actions they return (the workflows provider asks the
          // management service for a bounded slice). If we expose that
          // larger number as the registry-level total the UI shows
          // pagination controls for pages the registry can never produce,
          // since we merge-sort within what we received.
          if (result.total > result.actions.length) {
            this.logger.warn(
              `Inbox action provider "${provider.sourceApp}" reported ${result.total} total but returned ${result.actions.length}. ` +
                `Truncating to the returned slice for registry-level pagination.`
            );
          }
          return result;
        } catch (err) {
          this.logger.error(`Inbox action provider "${provider.sourceApp}" failed to list: ${err}`);
          return { actions: [], total: 0 };
        }
      })
    );

    const merged = results
      .flatMap((result) => result.actions)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Use the merged length so `total` is always consistent with what the
    // registry can actually page through. This avoids the empty-page
    // footgun described above.
    const total = merged.length;

    const start = (page - 1) * perPage;
    const end = start + perPage;

    return {
      actions: merged.slice(start, end),
      total,
    };
  }

  async respondTo(
    sourceApp: string,
    sourceId: string,
    input: Record<string, unknown>,
    ctx: InboxRequestContext
  ): Promise<void> {
    const provider = this.providers.get(sourceApp);
    if (!provider) {
      throw createUnknownInboxSourceAppError(sourceApp);
    }
    await provider.respond(sourceId, input, ctx);
  }
}
