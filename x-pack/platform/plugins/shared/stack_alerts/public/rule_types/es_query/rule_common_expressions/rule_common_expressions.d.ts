import React from 'react';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { ForLastExpression, GroupByExpression, OfExpression, ThresholdExpression, ValueExpression, WhenExpression } from '@kbn/triggers-actions-ui-plugin/public';
import type { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import type { CommonRuleParams } from '../types';
import type { TestQueryRowProps } from '../test_query_row';
export interface RuleCommonExpressionsProps extends CommonRuleParams {
    esFields: FieldOption[];
    errors: IErrorObject;
    hasValidationErrors: boolean;
    onChangeSelectedAggField: Parameters<typeof OfExpression>[0]['onChangeSelectedAggField'];
    onChangeSelectedAggType: Parameters<typeof WhenExpression>[0]['onChangeSelectedAggType'];
    onChangeSelectedGroupBy: Parameters<typeof GroupByExpression>[0]['onChangeSelectedGroupBy'];
    onChangeSelectedTermField: Parameters<typeof GroupByExpression>[0]['onChangeSelectedTermField'];
    onChangeSelectedTermSize: Parameters<typeof GroupByExpression>[0]['onChangeSelectedTermSize'];
    onChangeThreshold: Parameters<typeof ThresholdExpression>[0]['onChangeSelectedThreshold'];
    onChangeThresholdComparator: Parameters<typeof ThresholdExpression>[0]['onChangeSelectedThresholdComparator'];
    onChangeWindowSize: Parameters<typeof ForLastExpression>[0]['onChangeWindowSize'];
    onChangeWindowUnit: Parameters<typeof ForLastExpression>[0]['onChangeWindowUnit'];
    onChangeSizeValue: Parameters<typeof ValueExpression>[0]['onChangeSelectedValue'];
    onTestFetch: TestQueryRowProps['fetch'];
    onCopyQuery?: TestQueryRowProps['copyQuery'];
    onChangeExcludeHitsFromPreviousRun: (exclude: boolean) => void;
    canSelectMultiTerms?: boolean;
}
export declare const RuleCommonExpressions: React.FC<RuleCommonExpressionsProps>;
