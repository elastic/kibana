import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { EsQueryRuleParams } from './types';
export declare function getRuleType(alerting: AlertingSetup): RuleTypeModel<EsQueryRuleParams>;
