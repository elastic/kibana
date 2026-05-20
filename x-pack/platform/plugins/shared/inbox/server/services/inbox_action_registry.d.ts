import type { Logger } from '@kbn/logging';
import type { InboxAction } from '@kbn/inbox-common';
import type { InboxActionProvider, InboxActionProviderListParams, InboxRequestContext } from './inbox_action_provider';
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
export declare const isUnknownInboxSourceAppError: (error: unknown) => error is UnknownInboxSourceAppError;
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
export declare const isInboxActionConflictError: (error: unknown) => error is InboxActionConflictError;
export declare const createInboxActionConflictError: (sourceApp: string, sourceId: string, reason: string) => InboxActionConflictError;
/**
 * Fan-out + merge-sort + paginate registry. Each registered provider owns a
 * `sourceApp` namespace and handles its own storage. The registry is
 * deliberately dumb — it does not persist actions itself; it's a routing
 * layer that consumers of `@kbn/inbox-common` never see.
 */
export declare class InboxActionRegistry {
    private readonly logger;
    private readonly providers;
    constructor(logger: Logger);
    register(provider: InboxActionProvider): void;
    has(sourceApp: string): boolean;
    list(params: InboxActionRegistryListParams, ctx: InboxRequestContext): Promise<InboxActionRegistryListResult>;
    respondTo(sourceApp: string, sourceId: string, input: Record<string, unknown>, ctx: InboxRequestContext): Promise<void>;
}
