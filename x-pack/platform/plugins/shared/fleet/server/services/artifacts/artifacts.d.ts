import type { BinaryLike } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ListResult } from '../../../common/types';
import type { Artifact, ArtifactEncodedMetadata, ArtifactsClientCreateOptions, ListArtifactsProps, NewArtifact, FetchAllArtifactsOptions } from './types';
export declare const getArtifact: (esClient: ElasticsearchClient, id: string) => Promise<Artifact | undefined>;
export declare const createArtifact: (esClient: ElasticsearchClient, artifact: NewArtifact) => Promise<Artifact>;
export declare const BULK_CREATE_MAX_ARTIFACTS_BYTES = 4000000;
export declare const bulkCreateArtifacts: (esClient: ElasticsearchClient, artifacts: NewArtifact[], refresh?: boolean) => Promise<{
    artifacts?: Artifact[];
    errors?: Error[];
}>;
export declare const deleteArtifact: (esClient: ElasticsearchClient, id: string) => Promise<void>;
export declare const bulkDeleteArtifacts: (esClient: ElasticsearchClient, ids: string[]) => Promise<Error[]>;
export declare const listArtifacts: (esClient: ElasticsearchClient, options?: ListArtifactsProps) => Promise<ListResult<Artifact>>;
export declare const generateArtifactContentHash: (content: BinaryLike) => string;
export declare const encodeArtifactContent: (content: ArtifactsClientCreateOptions["content"]) => Promise<ArtifactEncodedMetadata>;
/**
 * Returns an iterator that loops through all the artifacts stored in the index
 *
 * @param esClient
 * @param options
 *
 * @example
 *
 * async () => {
 *   for await (const value of fetchAllArtifactsIterator()) {
 *     // process page of data here
 *   }
 * }
 */
export declare const fetchAllArtifacts: (esClient: ElasticsearchClient, options?: FetchAllArtifactsOptions) => AsyncIterable<Artifact[]>;
