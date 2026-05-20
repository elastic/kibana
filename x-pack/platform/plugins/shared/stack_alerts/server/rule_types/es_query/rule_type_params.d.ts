import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import { type EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';
export interface EsQueryRuleState extends RuleTypeState {
    latestTimestamp: string | undefined;
}
export type EsQueryAlertState = AlertState;
export type EsQueryRuleParamsExtractedParams = Omit<EsQueryRuleParams, 'searchConfiguration'> & {
    searchConfiguration: SerializedSearchSourceFields & {
        indexRefName: string;
    };
};
export declare function validateServerless(params: EsQueryRuleParams): void;
