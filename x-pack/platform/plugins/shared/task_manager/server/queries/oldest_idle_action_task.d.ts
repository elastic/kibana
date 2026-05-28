import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Returns the millisecond timestamp of the oldest action task that may still be executed (with a 24 hour delay).
 * Useful for cleaning up related objects that may no longer be needed.
 * @internal
 */
export declare const getOldestIdleActionTask: (client: Pick<ElasticsearchClient, "search">, taskManagerIndex: string) => Promise<string>;
