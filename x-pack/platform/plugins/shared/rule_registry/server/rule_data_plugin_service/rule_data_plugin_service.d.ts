import type { Observable } from 'rxjs';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PublicFrameworkAlertsService, DataStreamAdapter } from '@kbn/alerting-plugin/server';
import { type IRuleDataClient } from '../rule_data_client';
import { IndexInfo } from './index_info';
import type { Dataset, IndexOptions } from './index_options';
/**
 * A service for creating and using Elasticsearch indices for alerts-as-data.
 */
export interface IRuleDataService {
    /**
     * Returns a prefix used in the naming scheme of index aliases, templates
     * and other Elasticsearch resources that this service creates
     * for alerts-as-data indices.
     */
    getResourcePrefix(): string;
    /**
     * Prepends a relative resource name with the resource prefix.
     * @returns Full name of the resource.
     * @example 'security.alerts' => '.alerts-security.alerts'
     */
    getResourceName(relativeName: string): string;
    /**
     * If write is enabled for the specified registration context, everything works as usual.
     * If it's disabled, writing to the registration context's alerts-as-data indices will be disabled,
     * and also Elasticsearch resources associated with the indices will not be
     * installed.
     */
    isWriteEnabled(registrationContext: string): boolean;
    /**
     * If writer cache is enabled (the default), the writer will be cached
     * after being initialized. Disabling this is useful for tests, where we
     * expect to easily be able to clean up after ourselves between test cases.
     */
    isWriterCacheEnabled(): boolean;
    /**
     * Installs common Elasticsearch resources used by all alerts-as-data indices.
     */
    initializeService(): void;
    /**
     * Initializes alerts-as-data index and starts index bootstrapping right away.
     * @param indexOptions Index parameters: names and resources.
     * @returns Client for reading and writing data to this index.
     */
    initializeIndex(indexOptions: IndexOptions): IRuleDataClient;
    /**
     * Looks up the index information associated with the given registration context and dataset.
     */
    findIndexByName(registrationContext: string, dataset: Dataset): IndexInfo | null;
    /**
     * Looks up the index information associated with the given Kibana "feature".
     * Note: features are used in RBAC.
     */
    findIndexByFeature(featureId: ValidFeatureId, dataset: Dataset): IndexInfo | null;
}
export type RuleDataPluginService = IRuleDataService;
interface ConstructorOptions {
    getClusterClient: () => Promise<ElasticsearchClient>;
    logger: Logger;
    kibanaVersion: string;
    isWriteEnabled: boolean;
    isWriterCacheEnabled: boolean;
    disabledRegistrationContexts: string[];
    frameworkAlerts: PublicFrameworkAlertsService;
    pluginStop$: Observable<void>;
    dataStreamAdapter: DataStreamAdapter;
    elasticsearchAndSOAvailability$: Observable<boolean>;
}
export declare class RuleDataService implements IRuleDataService {
    private readonly options;
    private readonly indicesByBaseName;
    private readonly indicesByFeatureId;
    private readonly registrationContextByFeatureId;
    private readonly resourceInstaller;
    private installCommonResources;
    private isInitialized;
    constructor(options: ConstructorOptions);
    getResourcePrefix(): string;
    getResourceName(relativeName: string): string;
    isWriteEnabled(registrationContext: string): boolean;
    isRegistrationContextDisabled(registrationContext: string): boolean;
    /**
     * If writer cache is enabled (the default), the writer will be cached
     * after being initialized. Disabling this is useful for tests, where we
     * expect to easily be able to clean up after ourselves between test cases.
     */
    isWriterCacheEnabled(): boolean;
    /**
     * Installs common Elasticsearch resources used by all alerts-as-data indices.
     */
    initializeService(): void;
    initializeIndex(indexOptions: IndexOptions): IRuleDataClient;
    findIndexByName(registrationContext: string, dataset: Dataset): IndexInfo | null;
    findIndexByFeature(featureId: ValidFeatureId, dataset: Dataset): IndexInfo | null;
}
export {};
