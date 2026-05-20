import { type Logger } from '@kbn/core/server';
export interface Config {
    maxRevisions: number;
    maxPolicies: number;
    maxDocsToDelete: number;
    timeout?: string;
}
export interface Context {
    abortController?: AbortController;
    logger: Logger;
    config: Config;
}
export type PoliciesRevisionSummaries = Record<string, {
    maxRevision: number;
    minUsedRevision?: number;
    count: number;
}>;
