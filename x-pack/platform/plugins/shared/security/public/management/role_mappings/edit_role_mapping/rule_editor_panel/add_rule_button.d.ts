import React from 'react';
import type { Rule } from '../../model';
interface Props {
    onClick: (newRule: Rule) => void;
}
export declare const AddRuleButton: (props: Props) => React.JSX.Element;
export {};
