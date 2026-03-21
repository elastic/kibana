import type { Alert } from '@kbn/alerts-as-data-utils';
import type { Alert as LegacyAlert } from '../../../alert/alert';
import type { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../../types';
import type { AlertRule } from '../../types';
interface BuildDelayedAlertOpts<LegacyState extends AlertInstanceState, LegacyContext extends AlertInstanceContext, ActionGroupIds extends string, RecoveryActionGroupId extends string> {
    legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
    timestamp: string;
    rule: AlertRule;
}
/**
 * Builds a new alert document from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */
export declare const buildDelayedAlert: <AlertData extends RuleAlertData, LegacyState extends AlertInstanceState, LegacyContext extends AlertInstanceContext, ActionGroupIds extends string, RecoveryActionGroupId extends string>({ legacyAlert, timestamp, rule, }: BuildDelayedAlertOpts<LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>) => Alert & AlertData;
export {};
