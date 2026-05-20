import React from 'react';
export interface RuleCreateOptionsFlyoutProps {
    onClose: () => void;
    onCreateEsqlRule: () => void;
    onCreateWithAgent: () => void;
}
export declare const RuleCreateOptionsFlyout: ({ onClose, onCreateEsqlRule, onCreateWithAgent, }: RuleCreateOptionsFlyoutProps) => React.JSX.Element;
