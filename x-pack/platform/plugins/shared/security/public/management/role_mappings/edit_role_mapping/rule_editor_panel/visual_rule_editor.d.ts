import React, { Component } from 'react';
import type { Rule } from '../../model';
interface Props {
    rules: Rule | null;
    maxDepth: number;
    onChange: (rules: Rule | null) => void;
    onSwitchEditorMode: () => void;
    readOnly?: boolean;
}
export declare class VisualRuleEditor extends Component<Props, {}> {
    static defaultProps: Partial<Props>;
    render(): React.JSX.Element;
    private canUseVisualEditor;
    private getRuleDepthWarning;
    private onRuleChange;
    private onRuleDelete;
    private renderRule;
    private getEditorForRuleType;
}
export {};
