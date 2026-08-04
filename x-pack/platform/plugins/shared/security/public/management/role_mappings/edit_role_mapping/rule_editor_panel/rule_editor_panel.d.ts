import React, { Component } from 'react';
import type { DocLinksStart } from '@kbn/core/public';
import type { RoleMapping } from '../../../../../common';
import type { Rule } from '../../model';
interface Props {
    rawRules: RoleMapping['rules'];
    onChange: (rawRules: RoleMapping['rules']) => void;
    onValidityChange: (isValid: boolean) => void;
    validateForm: boolean;
    docLinks: DocLinksStart;
    readOnly?: boolean;
}
interface State {
    rules: Rule | null;
    maxDepth: number;
    isRuleValid: boolean;
    showConfirmModeChange: boolean;
    showVisualEditorDisabledAlert: boolean;
    mode: 'visual' | 'json';
}
export declare class RuleEditorPanel extends Component<Props, State> {
    static defaultProps: Partial<Props>;
    constructor(props: Props);
    render(): React.JSX.Element;
    private conditionallyRenderEditModeToggle;
    private initializeFromRawRules;
    private getModeToggle;
    private getEditor;
    private getConfirmModeChangePrompt;
    private onRuleChange;
    private onValidityChange;
    private trySwitchEditorMode;
}
export {};
