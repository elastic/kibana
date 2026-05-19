import React from 'react';
import type { RuleGroup } from '../../model';
interface Props {
    rule: RuleGroup;
    readOnly?: boolean;
    parentRule?: RuleGroup;
    onChange: (rule: RuleGroup) => void;
}
export declare const RuleGroupTitle: (props: Props) => React.JSX.Element;
export {};
