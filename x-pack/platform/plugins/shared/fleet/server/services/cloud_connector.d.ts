import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CloudConnector, CloudConnectorListOptions } from '../../common/types/models/cloud_connector';
import type { CreateCloudConnectorRequest, UpdateCloudConnectorRequest } from '../../common/types/rest_spec/cloud_connector';
export interface CloudConnectorServiceInterface {
    create(soClient: SavedObjectsClientContract, cloudConnector: CreateCloudConnectorRequest): Promise<CloudConnector>;
    getList(soClient: SavedObjectsClientContract, options?: Omit<CloudConnectorListOptions, 'fields'>): Promise<CloudConnector[]>;
    getList(soClient: SavedObjectsClientContract, options: CloudConnectorListOptions & {
        fields: string[];
    }): Promise<Partial<CloudConnector>[]>;
    getById(soClient: SavedObjectsClientContract, cloudConnectorId: string): Promise<CloudConnector>;
    update(soClient: SavedObjectsClientContract, cloudConnectorId: string, cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>): Promise<CloudConnector>;
    delete(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, cloudConnectorId: string, force?: boolean): Promise<{
        id: string;
    }>;
}
export declare class CloudConnectorService implements CloudConnectorServiceInterface {
    private static readonly EXTERNAL_ID_REGEX;
    protected getLogger(...childContextPaths: string[]): Logger;
    /**
     * Normalizes a cloud connector name by trimming and collapsing consecutive spaces
     * @param name - The name to normalize
     * @returns The normalized name
     */
    private static normalizeName;
    /**
     * Queries package policies to get a map of cloud connector IDs to their
     * user-visible package policy counts. Hidden internal packages (e.g. verifier_otel)
     * and non-latest revisions (e.g. `:prev` rollback snapshots) are excluded in the
     * saved-objects filter. Uses a terms aggregation (see `package_policies_aggregation`).
     * `size` matches {@link SO_SEARCH_LIMIT} so bucket count is not capped at ES default (10).
     */
    private getPackagePolicyCountsMap;
    /**
     * Gets the package policy count for a specific cloud connector.
     * @param soClient - Saved objects client
     * @param cloudConnectorId - ID of the cloud connector
     * @returns The number of package policies using this cloud connector
     */
    private getPackagePolicyCount;
    /**
     * Validates and normalizes a cloud connector name, checking for duplicates
     * @param soClient - Saved objects client
     * @param name - The name to validate
     * @param excludeId - Optional cloud connector ID to exclude from duplicate check (for updates)
     * @returns The normalized name
     * @throws CloudConnectorCreateError if a duplicate name is found
     */
    private validateAndNormalizeName;
    create(soClient: SavedObjectsClientContract, cloudConnector: CreateCloudConnectorRequest): Promise<CloudConnector>;
    getList(soClient: SavedObjectsClientContract, options?: Omit<CloudConnectorListOptions, 'fields'>): Promise<CloudConnector[]>;
    getList(soClient: SavedObjectsClientContract, options: CloudConnectorListOptions & {
        fields: string[];
    }): Promise<Partial<CloudConnector>[]>;
    getById(soClient: SavedObjectsClientContract, cloudConnectorId: string): Promise<CloudConnector>;
    update(soClient: SavedObjectsClientContract, cloudConnectorId: string, cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>): Promise<CloudConnector>;
    delete(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, cloudConnectorId: string, force?: boolean): Promise<{
        id: string;
    }>;
    private validateCloudConnectorDetails;
}
export declare const cloudConnectorService: CloudConnectorService;
