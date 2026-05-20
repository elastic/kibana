import type { KibanaRequest, SavedObjectsServiceStart, Logger, ElasticsearchClient, IBasePath, SecurityServiceStart } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { FilesStart } from '@kbn/files-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import type { CasesClient } from '.';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import type { ConfigType } from '../config';
import type { CasesEventBus } from '../events/event_bus';
interface CasesClientFactoryArgs {
    securityPluginSetup: SecurityPluginSetup;
    securityPluginStart: SecurityPluginStart;
    securityServiceStart: SecurityServiceStart;
    spacesPluginStart?: SpacesPluginStart;
    featuresPluginStart: FeaturesPluginStart;
    actionsPluginStart: ActionsPluginStart;
    licensingPluginStart: LicensingPluginStart;
    lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
    notifications: NotificationsPluginStart;
    ruleRegistry: RuleRegistryPluginStartContract;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
    publicBaseUrl?: IBasePath['publicBaseUrl'];
    filesPluginStart: FilesStart;
    usageCounter?: IUsageCounter;
    config: ConfigType;
    casesEventBus?: CasesEventBus;
    closeReasonValidator?: (closeReason: string, owner: string, request: KibanaRequest) => Promise<boolean>;
}
/**
 * This class handles the logic for creating a CasesClient. We need this because some of the member variables
 * can't be initialized until a plugin's start() method but we need to register the case context in the setup() method.
 */
export declare class CasesClientFactory {
    private isInitialized;
    private readonly logger;
    protected options?: CasesClientFactoryArgs;
    constructor(logger: Logger);
    /**
     * This should be called by the plugin's start() method.
     */
    initialize(options: CasesClientFactoryArgs): void;
    /**
     * Creates a cases client for the current request. This request will be used to authorize the operations done through
     * the client.
     */
    create({ request, scopedClusterClient, savedObjectsService, }: {
        request: KibanaRequest;
        savedObjectsService: SavedObjectsServiceStart;
        scopedClusterClient: ElasticsearchClient;
    }): Promise<CasesClient>;
    private validateInitialization;
    private createServices;
    /**
     * This function attempts to retrieve the current user's info. The first method is using the user profile api
     * provided by the security plugin. If that fails or the session isn't found then we will attempt using authc
     * which will not retrieve the profile uid but at least gets us the username and sometimes full name, and email.
     *
     * This function also forces the fields to be strings or null (except the profile uid since it's optional anyway)
     * because the get case API expects a created_by field to be set. If we leave the fields as undefined
     * then the resulting object in ES will just be empty and it'll fail to encode the user when returning it to the API
     * request. If we force them to be null it will succeed.
     */
    private getUserInfo;
}
export {};
