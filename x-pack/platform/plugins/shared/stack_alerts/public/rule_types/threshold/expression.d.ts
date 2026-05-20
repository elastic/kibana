import React from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { IndexThresholdRuleParams } from './types';
export declare const DEFAULT_VALUES: {
    AGGREGATION_TYPE: string;
    TERM_SIZE: number;
    THRESHOLD_COMPARATOR: COMPARATORS;
    TIME_WINDOW_SIZE: number;
    TIME_WINDOW_UNIT: string;
    THRESHOLD: number[];
    GROUP_BY: string;
};
export declare const IndexThresholdRuleTypeExpression: React.FunctionComponent<Omit<RuleTypeParamsExpressionProps<IndexThresholdRuleParams>, 'unifiedSearch'>>;
export { IndexThresholdRuleTypeExpression as default };
