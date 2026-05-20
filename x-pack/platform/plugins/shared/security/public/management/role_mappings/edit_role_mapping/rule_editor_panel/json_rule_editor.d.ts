import React from 'react';
import type { Rule } from '../../model';
interface Props {
    rules: Rule | null;
    onChange: (updatedRules: Rule | null) => void;
    onValidityChange: (isValid: boolean) => void;
    readOnly?: boolean;
}
export declare const JSONRuleEditor: (props: Props) => React.JSX.Element;
export {};
