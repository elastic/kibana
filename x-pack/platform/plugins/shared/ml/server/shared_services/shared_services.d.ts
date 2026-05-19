import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { IClusterClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { CoreAuditService } from '@kbn/core-security-server';
import type { ResolveMlCapabilities, MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';
import type { FieldFormatsRegistryProvider } from '@kbn/ml-common-types/kibana';
import type { CompatibleModule, MlFeatures } from '../../common/constants/app';
import type { MlLicense } from '../../common/license';
import type { MlSystemProvider, JobServiceProvider, ResultsServiceProvider, TrainedModelsProvider, AnomalyDetectorsProvider, ModulesProvider } from './providers';
import type { MlClient } from '../lib/ml_client';
import type { MLSavedObjectService } from '../saved_objects';
import type { MlAlertingServiceProvider } from './providers/alerting_service';
import type { JobsHealthServiceProvider } from '../lib/alerts/jobs_health_service';
import type { GetDataViewsService } from '../lib/data_views_utils';
import type { ServerlessInfo } from '../types';
export type SharedServices = JobServiceProvider & AnomalyDetectorsProvider & MlSystemProvider & ModulesProvider & ResultsServiceProvider & MlAlertingServiceProvider & TrainedModelsProvider;
export type MlServicesProviders = JobsHealthServiceProvider;
interface Guards {
    isMinimumLicense(): Guards;
    isFullLicense(): Guards;
    hasMlCapabilities: (caps: MlCapabilitiesKey[]) => Guards;
    ok(callback: OkCallback): any;
}
export type GetGuards = (request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) => Guards;
export interface SharedServicesChecks {
    getGuards(request: KibanaRequest): Guards;
}
interface OkParams {
    scopedClient: IScopedClusterClient;
    mlClient: MlClient;
    mlSavedObjectService: MLSavedObjectService;
    getFieldsFormatRegistry: FieldFormatsRegistryProvider;
    getDataViewsService: GetDataViewsService;
}
type OkCallback = (okParams: OkParams) => any;
export declare function createSharedServices(mlLicense: MlLicense, getSpaces: (() => Promise<SpacesPluginStart>) | undefined, cloud: CloudSetup, authorization: SecurityPluginSetup['authz'] | undefined, resolveMlCapabilities: ResolveMlCapabilities, getClusterClient: () => IClusterClient | null, getInternalSavedObjectsClient: () => SavedObjectsClientContract | null, getUiSettings: () => UiSettingsServiceStart | null, getFieldsFormat: () => FieldFormatsStart | null, getDataViews: () => DataViewsPluginStart, getAuditService: () => CoreAuditService | null, isMlReady: () => Promise<void>, compatibleModuleType: CompatibleModule | null, enabledFeatures: MlFeatures, serverless: ServerlessInfo): {
    sharedServicesProviders: SharedServices;
    internalServicesProviders: MlServicesProviders;
};
export {};
