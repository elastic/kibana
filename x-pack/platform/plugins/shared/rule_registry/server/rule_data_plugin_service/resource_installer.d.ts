import { type Observable } from 'rxjs';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { type PublicFrameworkAlertsService, type DataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { IndexInfo } from './index_info';
interface ConstructorOptions {
    getResourceName(relativeName: string): string;
    getClusterClient: () => Promise<ElasticsearchClient>;
    logger: Logger;
    isWriteEnabled: boolean;
    disabledRegistrationContexts: string[];
    frameworkAlerts: PublicFrameworkAlertsService;
    pluginStop$: Observable<void>;
    dataStreamAdapter: DataStreamAdapter;
    elasticsearchAndSOAvailability$: Observable<boolean>;
}
export type IResourceInstaller = PublicMethodsOf<ResourceInstaller>;
export declare class ResourceInstaller {
    private readonly options;
    constructor(options: ConstructorOptions);
    /**
     * Installs common, library-level resources shared between all indices:
     *   - default ILM policy
     *   - component template containing technical fields
     *   - component template containing all standard ECS fields
     */
    installCommonResources(): Promise<void>;
    /**
     * Installs index-level resources shared between all namespaces of this index:
     *   - custom ILM policy if it was provided
     *   - component templates
     */
    installIndexLevelResources(indexInfo: IndexInfo): Promise<void>;
    /**
     * Installs and updates resources tied to concrete namespace of an index:
     *   - namespaced index template
     *   - Index mappings for existing concrete indices
     *   - concrete index (write target) if it doesn't exist
     */
    installAndUpdateNamespaceLevelResources(indexInfo: IndexInfo, namespace: string): Promise<void>;
    private getIlmPolicyName;
}
export {};
