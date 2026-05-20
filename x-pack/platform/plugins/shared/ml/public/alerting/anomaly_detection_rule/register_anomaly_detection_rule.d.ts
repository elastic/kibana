import { type TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlCoreSetup } from '../../plugin';
export declare function registerAnomalyDetectionRule(triggersActionsUi: TriggersAndActionsUIPublicPluginSetup, getStartServices: MlCoreSetup['getStartServices'], mlCapabilities: MlCapabilities): void;
