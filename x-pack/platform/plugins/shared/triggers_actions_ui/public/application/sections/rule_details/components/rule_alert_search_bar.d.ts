import React from 'react';
import type { BoolQuery } from '@kbn/es-query';
interface RuleAlertSearchBarProps {
    ruleTypeId: string;
    onEsQueryChange: (esQuery: {
        bool: BoolQuery;
    }) => void;
}
export declare const RuleAlertSearchBar: ({ ruleTypeId, onEsQueryChange }: RuleAlertSearchBarProps) => React.JSX.Element;
export {};
