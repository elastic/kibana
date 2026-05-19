import React, { Component } from 'react';
import type { RuleGroup } from '../../model';
interface Props {
    rule: RuleGroup;
    allowAdd: boolean;
    parentRule?: RuleGroup;
    ruleDepth: number;
    onChange: (rule: RuleGroup) => void;
    onDelete: () => void;
    readOnly?: boolean;
}
export declare class RuleGroupEditor extends Component<Props, {}> {
    static defaultProps: Partial<Props>;
    render(): React.JSX.Element;
    private renderSubRules;
    private onAddRuleClick;
}
export {};
