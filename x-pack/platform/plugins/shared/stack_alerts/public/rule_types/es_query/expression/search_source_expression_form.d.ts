import React from 'react';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { SavedQuery, ISearchSource } from '@kbn/data-plugin/public';
import type { EsQueryRuleMetaData, EsQueryRuleParams, SearchType } from '../types';
interface SearchSourceExpressionFormProps {
    searchSource: ISearchSource;
    ruleParams: EsQueryRuleParams<SearchType.searchSource>;
    errors: IErrorObject;
    metadata?: EsQueryRuleMetaData;
    initialSavedQuery?: SavedQuery;
    setParam: (paramField: string, paramValue: unknown) => void;
    onChangeMetaData: (metadata: EsQueryRuleMetaData) => void;
}
export declare const SearchSourceExpressionForm: (props: SearchSourceExpressionFormProps) => React.JSX.Element;
export {};
