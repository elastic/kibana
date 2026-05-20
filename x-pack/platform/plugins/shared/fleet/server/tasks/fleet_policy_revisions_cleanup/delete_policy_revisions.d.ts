import { type ElasticsearchClient } from '@kbn/core/server';
import type { Context, PoliciesRevisionSummaries } from './types';
export declare const deletePolicyRevisions: (esClient: ElasticsearchClient, policiesRevisionSummaries: PoliciesRevisionSummaries, context: Context) => Promise<import("@elastic/elasticsearch/lib/api/types").DeleteByQueryResponse | undefined>;
