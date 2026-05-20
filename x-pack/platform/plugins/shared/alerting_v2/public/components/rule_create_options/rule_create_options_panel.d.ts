import React from 'react';
interface RuleCreateOptionsPanelProps {
    onCreateEsqlRule: () => void;
    layout?: 'vertical' | 'horizontal';
    onCreateWithAgent: () => void;
}
export declare const RuleCreateOptionsPanel: React.FC<RuleCreateOptionsPanelProps>;
export {};
