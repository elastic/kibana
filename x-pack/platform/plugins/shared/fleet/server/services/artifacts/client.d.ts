import type { ElasticsearchClient } from '@kbn/core/server';
import type { ListResult } from '../../../common/types';
import type { Artifact, ArtifactsClientCreateOptions, ArtifactEncodedMetadata, ArtifactsClientInterface, ListArtifactsProps, FetchAllArtifactsOptions } from './types';
/**
 * Exposes an interface for access artifacts from within the context of a single integration (`packageName`)
 */
export declare class FleetArtifactsClient implements ArtifactsClientInterface {
    private esClient;
    private packageName;
    constructor(esClient: ElasticsearchClient, packageName: string);
    private validate;
    /**
     * Creates a `kuery` string using the provided value on input that is bound to the integration package
     * @param kuery
     * @internal
     */
    private buildFilter;
    getArtifact(id: string): Promise<Artifact | undefined>;
    /**
     * Creates a new artifact. Content will be compress and stored in binary form.
     */
    createArtifact({ content, type, identifier, }: ArtifactsClientCreateOptions): Promise<Artifact>;
    bulkCreateArtifacts(optionsList: ArtifactsClientCreateOptions[]): Promise<{
        artifacts?: Artifact[];
        errors?: Error[];
    }>;
    deleteArtifact(id: string): Promise<void>;
    bulkDeleteArtifacts(ids: string[]): Promise<Error[]>;
    /**
     * Get a list of artifacts. A few things to note:
     * - if wanting to get ALL artifacts, consider using instead the `fetchAll()` method instead
     *   as it will property return data past the 10k ES limitation
     * - when using the `kuery` filtering param, all filters property names should match the
     *   internal attribute names in the index
     */
    listArtifacts({ kuery, ...options }?: ListArtifactsProps): Promise<ListResult<Artifact>>;
    /**
     * Returns an `AsyncIterable` object that can be used to iterate over all artifacts
     *
     * @param options
     *
     * @example
     * async () => {
     *   for await (const artifacts of fleetArtifactsClient.fetchAll()) {
     *     // artifacts === first page of items
     *   }
     * }
     */
    fetchAll({ kuery, ...options }?: FetchAllArtifactsOptions): AsyncIterable<Artifact[]>;
    generateHash(content: string): string;
    encodeContent(content: ArtifactsClientCreateOptions['content']): Promise<ArtifactEncodedMetadata>;
}
