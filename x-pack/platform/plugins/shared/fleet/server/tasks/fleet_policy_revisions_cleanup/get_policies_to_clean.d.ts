import { type ElasticsearchClient } from '@kbn/core/server';
import type { Context, PoliciesRevisionSummaries } from './types';
export declare const getPoliciesToClean: (esClient: ElasticsearchClient, context: Context) => Promise<PoliciesRevisionSummaries>;
