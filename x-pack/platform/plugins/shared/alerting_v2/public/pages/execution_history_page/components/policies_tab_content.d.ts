import React from 'react';
interface Props {
    onPolicyClick: (policyId: string) => void;
    onRuleClick: (ruleId: string) => void;
    activeRuleId: string | null;
}
export declare const PoliciesTabContent: ({ onPolicyClick, onRuleClick, activeRuleId }: Props) => React.JSX.Element;
export {};
