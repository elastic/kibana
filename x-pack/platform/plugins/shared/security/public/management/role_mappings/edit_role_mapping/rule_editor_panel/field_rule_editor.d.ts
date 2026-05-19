import React, { Component } from 'react';
import { FieldRule } from '../../model';
interface Props {
    rule: FieldRule;
    onChange: (rule: FieldRule) => void;
    onDelete: () => void;
    readOnly?: boolean;
}
export declare class FieldRuleEditor extends Component<Props, {}> {
    static defaultProps: Partial<Props>;
    render(): React.JSX.Element;
    private renderFieldRow;
    private conditionallyRenderAddButton;
    private conditionallyRenderDeleteButton;
    private renderFieldTypeInput;
    private renderFieldValueInput;
    private getInputFieldForType;
    private onAddAlternateValue;
    private onRemoveAlternateValue;
    private onFieldChange;
    private onAddField;
    private onValueChange;
    private onNumericValueChange;
    private onBooleanValueChange;
    private onComparisonTypeChange;
    private getComparisonType;
}
export {};
