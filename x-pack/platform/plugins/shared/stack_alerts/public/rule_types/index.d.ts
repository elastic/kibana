import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
export declare function registerRuleTypes({ ruleTypeRegistry, alerting, }: {
    ruleTypeRegistry: TriggersAndActionsUIPublicPluginSetup['ruleTypeRegistry'];
    alerting: AlertingSetup;
}, isServerless: boolean): void;
