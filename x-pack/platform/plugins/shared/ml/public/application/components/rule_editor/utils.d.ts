export function getNewConditionDefaults(): {
    applies_to: ML_DETECTOR_RULE_APPLIES_TO;
    operator: ML_DETECTOR_RULE_OPERATOR;
    value: number;
};
export function getNewRuleDefaults(): {
    actions: ML_DETECTOR_RULE_ACTION[];
    conditions: never[];
};
export function getScopeFieldDefaults(filterListIds: any): {
    filter_type: ML_DETECTOR_RULE_FILTER_TYPE;
    enabled: boolean;
};
export function isValidRule(rule: any): boolean;
export function saveJobRule(mlJobService: any, job: any, detectorIndex: any, ruleIndex: any, editedRule: any, mlApi: any): Promise<any>;
export function deleteJobRule(mlJobService: any, job: any, detectorIndex: any, ruleIndex: any, mlApi: any): Promise<any>;
export function updateJobRules(mlJobService: any, job: any, detectorIndex: any, rules: any, mlApi: any): Promise<any>;
export function addItemToFilter(item: any, filterId: any, mlApi: any): Promise<any>;
export function buildRuleDescription(rule: any): string;
export function filterTypeToText(filterType: any): any;
export function appliesToText(appliesTo: any): any;
export function operatorToText(operator: any): any;
export function getAppliesToValueFromAnomaly(anomaly: any, appliesTo: any): any;
import { ML_DETECTOR_RULE_APPLIES_TO } from '@kbn/ml-anomaly-utils';
import { ML_DETECTOR_RULE_OPERATOR } from '@kbn/ml-anomaly-utils';
import { ML_DETECTOR_RULE_ACTION } from '@kbn/ml-anomaly-utils';
import { ML_DETECTOR_RULE_FILTER_TYPE } from '@kbn/ml-anomaly-utils';
