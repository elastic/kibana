import type { CoreSetup } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlFeatures, NLPSettings, ExperimentalFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';
import type { ITelemetryClient } from '../services/telemetry/types';
export declare enum MANAGEMENT_SECTION_IDS {
    OVERVIEW = "overview",
    ANOMALY_DETECTION = "anomaly_detection",
    ANALYTICS = "analytics",
    TRAINED_MODELS = "trained_models",
    AD_SETTINGS = "ad_settings"
}
export type ManagementSectionId = `${MANAGEMENT_SECTION_IDS}`;
export declare const MANAGEMENT_SECTIONS: Record<ManagementSectionId, string>;
export declare function registerManagementSections(management: ManagementSetup, core: CoreSetup<MlStartDependencies>, deps: {
    usageCollection?: UsageCollectionSetup;
    telemetry?: ITelemetryClient;
}, isServerless: boolean, mlFeatures: MlFeatures, nlpSettings: NLPSettings, experimentalFeatures: ExperimentalFeatures, mlCapabilities: MlCapabilities): void;
