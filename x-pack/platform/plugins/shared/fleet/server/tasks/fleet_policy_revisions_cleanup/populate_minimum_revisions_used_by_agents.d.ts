import { type ElasticsearchClient } from '@kbn/core/server';
import type { Context, PoliciesRevisionSummaries } from './types';
export declare const populateMinimumRevisionsUsedByAgents: (esClient: ElasticsearchClient, policiesRevisionSummaries: PoliciesRevisionSummaries, context: Context) => Promise<PoliciesRevisionSummaries>;
