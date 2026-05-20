import type { ElasticsearchClient } from '@kbn/core/server';
import type { ActionsByType } from './types';
export declare const MANAGED_BY_STREAMS = "streams";
/**
 * ClassicStreams sometimes share index templates and ingest pipelines (user managed or Streams managed)
 * In order to modify this pipelines in an atomic way and be able to clean up any Streams managed pipeline when no longer needed
 * We need to translate some actions
 */
export declare function translateClassicStreamPipelineActions(actionsByType: ActionsByType, esClient: ElasticsearchClient): Promise<void>;
