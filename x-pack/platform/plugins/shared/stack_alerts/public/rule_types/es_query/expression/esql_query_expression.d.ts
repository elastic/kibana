import React from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleParams, EsQueryRuleMetaData } from '../types';
import { SearchType } from '../types';
export declare const getTimeFilter: (timeField: string, window: string) => {
    timeRange: {
        from: string;
        to: string;
    };
    timeFilter: {
        bool: {
            filter: {
                range: {
                    [x: string]: {
                        lte: string;
                        gt: string;
                        format: string;
                    };
                };
            }[];
        };
    };
};
export declare const EsqlQueryExpression: React.FC<RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>>;
