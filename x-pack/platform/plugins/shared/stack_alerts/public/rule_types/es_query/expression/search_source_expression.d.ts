import React from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleMetaData, EsQueryRuleParams } from '../types';
import type { SearchType } from '../types';
export type SearchSourceExpressionProps = RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.searchSource>, EsQueryRuleMetaData>;
export declare const SearchSourceExpression: ({ ruleParams, errors, setRuleParams, setRuleProperty, metadata, onChangeMetaData, }: SearchSourceExpressionProps) => React.JSX.Element;
