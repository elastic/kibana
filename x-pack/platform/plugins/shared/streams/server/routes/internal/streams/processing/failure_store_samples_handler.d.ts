import type { ElasticsearchClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';
export interface FailureStoreSamplesParams {
    path: {
        name: string;
    };
    query?: {
        size?: number;
        start?: string;
        end?: string;
    };
}
export interface FailureStoreSamplesDeps {
    params: FailureStoreSamplesParams;
    esClient: ElasticsearchClient;
    streamsClient: StreamsClient;
    fieldsMetadataClient: IFieldsMetadataClient;
}
export interface FailureStoreSamplesResponse {
    documents: FlattenRecord[];
}
/**
 * Fetches documents from the failure store and applies all configured processors
 * from parent streams to transform them.
 *
 * All failure store documents are returned regardless of when they failed, since
 * the simulation uses the current processing configuration. If processing has been
 * fixed since the failure, the simulation will succeed anyway.
 *
 * Optimizations:
 * - Direct children of root streams (e.g., logs.child) have no ancestor processing,
 *   so we skip fetching ancestors entirely.
 * - If the failure store is empty, we return early without fetching ancestors.
 * - Deeper nested streams (e.g., logs.child.grandchild) go through the full flow.
 */
export declare const getFailureStoreSamples: ({ params, esClient, streamsClient, fieldsMetadataClient, }: FailureStoreSamplesDeps) => Promise<FailureStoreSamplesResponse>;
/**
 * Collects and combines processing steps from all ancestors in order from root to closest parent.
 * This brings failure store documents to the state they would be in when entering the current
 * stream's pipeline, so the simulation can accurately show what the current stream's processors
 * do to them.
 *
 * The current stream's own processors are intentionally excluded — those are what the UI simulation
 * will run, and pre-applying them here would cause docs to appear already-parsed and then fail
 * the simulation on a second pass.
 */
export declare function collectAncestorProcessing(ancestors: Streams.WiredStream.Definition[]): StreamlangDSL;
