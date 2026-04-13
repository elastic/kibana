import { type RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
import type { DataViewFieldBase } from '@kbn/es-query';
export declare const defaultRuleParams: Partial<DegradedDocsRuleParams>;
export type DataStreamGroupByFields = Array<DataViewFieldBase & {
    aggregatable: boolean;
}>;
export declare const RuleForm: React.FunctionComponent<RuleTypeParamsExpressionProps<DegradedDocsRuleParams, {
    adHocDataViewList: DataView[];
}>>;
