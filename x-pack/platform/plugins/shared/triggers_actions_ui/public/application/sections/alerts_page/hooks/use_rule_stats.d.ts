import React from 'react';
interface Props {
    ruleTypeIds?: string[];
    consumers?: string[];
    enabled?: boolean;
}
export declare const useRuleStats: ({ ruleTypeIds, consumers, enabled }?: Props) => React.JSX.Element[];
export {};
