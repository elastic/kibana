import React from 'react';
interface Props {
    onPolicyClick: (policyId: string) => void;
    onRuleClick: (ruleId: string) => void;
}
export declare const PoliciesTabContent: ({ onPolicyClick, onRuleClick }: Props) => React.JSX.Element;
export {};
