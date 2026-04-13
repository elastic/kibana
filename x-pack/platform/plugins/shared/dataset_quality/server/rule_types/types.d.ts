import type { ActionGroupIdsOf, AlertInstanceContext as AlertContext, AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';
import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import type { StackAlert } from '@kbn/alerts-as-data-utils';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
export type DatasetQualityRuleParams = DegradedDocsRuleParams;
export type DatasetQualityRuleTypeState = RuleTypeState;
export type DatasetQualityAlertState = AlertState;
export type DatasetQualityAlertContext = AlertContext;
export type DatasetQualityAllowedActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
export type DatasetQualityAlert = Omit<StackAlert, 'kibana.alert.evaluation.threshold'> & {
    'kibana.alert.evaluation.threshold'?: string | number | null;
    'kibana.alert.grouping'?: Record<string, string>;
};
export interface AdditionalContext {
    [x: string]: any;
}
export declare const DATASET_QUALITY_REGISTRATION_CONTEXT = "dataset.quality";
export declare const THRESHOLD_MET_GROUP: {
    id: string;
    name: string;
};
export declare const MISSING_VALUE: string;
