import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
export declare function registerJobsHealthAlertingRule(triggersActionsUi: TriggersAndActionsUIPublicPluginSetup, alerting?: AlertingSetup): void;
