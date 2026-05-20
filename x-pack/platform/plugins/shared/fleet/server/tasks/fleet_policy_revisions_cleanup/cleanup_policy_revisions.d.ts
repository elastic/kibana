import { type ElasticsearchClient } from '@kbn/core/server';
import type { Context, Config } from './types';
type ContextParam = Omit<Context, 'config'> & {
    config?: Partial<Config>;
};
export declare const cleanupPolicyRevisions: (esClient: ElasticsearchClient, context: ContextParam) => Promise<{
    totalDeletedRevisions: number | undefined;
} | undefined>;
export declare const throwIfAborted: (abortController?: AbortController) => void;
export {};
