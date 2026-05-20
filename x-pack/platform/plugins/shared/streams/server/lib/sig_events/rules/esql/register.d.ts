import type { AlertInstanceContext, RuleTypeState } from '@kbn/alerting-plugin/server';
import type { PersistenceAlertType } from '@kbn/rule-registry-plugin/server';
import type { EsqlRuleParams } from './types';
export declare function esqlRuleType(): PersistenceAlertType<EsqlRuleParams, RuleTypeState, AlertInstanceContext, 'default'>;
