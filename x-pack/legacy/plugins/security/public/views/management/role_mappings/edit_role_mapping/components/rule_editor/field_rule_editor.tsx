/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent } from 'react';
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButton,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { FieldRule } from '../../../../../../../common/model/role_mappings/field_rule';
import { RoleMappingFieldRuleValue } from '../../../../../../../common/model';

interface Props {
  rule: FieldRule;
  allowAdd: boolean;
  allowDelete: boolean;
  onChange: (rule: FieldRule) => void;
  onDelete: () => void;
}

interface State {
  openPopoverIds: string[];
}

const userFields = [
  {
    name: 'username',
  },
  {
    name: 'dn',
  },
  {
    name: 'groups',
  },
  {
    name: 'realm',
  },
];

const fieldOptions = userFields.map(f => ({ label: f.name }));

type ComparisonOption = 'text' | 'number' | 'null';
const comparisonOptions: Record<
  ComparisonOption,
  { id: string; label: string; defaultValue: RoleMappingFieldRuleValue }
> = {
  text: {
    id: 'text',
    label: 'matches text',
    defaultValue: '*',
  },
  number: {
    id: 'number',
    label: 'equals number',
    defaultValue: 0,
  },
  null: {
    id: 'null',
    label: 'is null',
    defaultValue: null,
  },
};

export class FieldRuleEditor extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      openPopoverIds: [],
    };
  }

  public render() {
    const { field, value } = this.props.rule;

    const content = Array.isArray(value)
      ? value.map((v, index) =>
          index === 0
            ? this.renderPrimaryFieldRow(field, value)
            : this.renderFieldRow(field, value, index)
        )
      : [this.renderPrimaryFieldRow(field, value)];

    return (
      <EuiFlexGroup direction="column">
        {content.map((row, index) => {
          return <EuiFlexItem key={index}>{row}</EuiFlexItem>;
        })}
      </EuiFlexGroup>
    );
  }

  private renderPrimaryFieldRow = (field: string, ruleValue: RoleMappingFieldRuleValue) => {
    let renderAddValueButton = true;
    let renderDeleteButton = this.props.allowDelete;
    let rowRuleValue: RoleMappingFieldRuleValue = ruleValue;
    if (Array.isArray(ruleValue)) {
      renderDeleteButton = ruleValue.length > 1 || this.props.allowDelete;
      renderAddValueButton = ruleValue.length === 1;
      rowRuleValue = ruleValue[0];
    }

    const valueComparison = this.getComparisonType(rowRuleValue);

    const type = valueComparison.id === 'number' ? 'number' : 'text';

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={1}>
          <EuiFormRow label="User field">
            <EuiComboBox
              isClearable={false}
              selectedOptions={[{ label: field }]}
              singleSelection={{ asPlainText: true }}
              onChange={this.onFieldChange}
              onCreateOption={this.onAddField}
              options={fieldOptions}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {this.renderFieldTypeInput(type, rowRuleValue, valueComparison.id, 0)}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {this.renderFieldValueInput(type, rowRuleValue, valueComparison.id, 0)}
        </EuiFlexItem>
        {renderDeleteButton && (
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace={true}>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={() => this.onRemoveAlternateValue(0)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={1}>
          <EuiFormRow hasEmptyLabelSpace={true}>
            {renderAddValueButton ? (
              <EuiButton
                onClick={this.onAddAlternateValue}
                iconType="plusInCircle"
                color="primary"
                size="s"
              >
                add alternate value
              </EuiButton>
            ) : (
              <EuiSpacer />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private renderFieldRow = (
    field: string,
    ruleValue: RoleMappingFieldRuleValue,
    valueIndex: number
  ) => {
    let renderAddValueButton = true;
    let rowRuleValue: RoleMappingFieldRuleValue = ruleValue;
    if (Array.isArray(ruleValue)) {
      renderAddValueButton = valueIndex === ruleValue.length - 1;
      rowRuleValue = ruleValue[valueIndex];
    }

    const valueComparison = this.getComparisonType(rowRuleValue);

    const type = valueComparison.id === 'number' ? 'number' : 'text';

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={1}>
          <EuiFormRow hasEmptyLabelSpace={true}>
            <EuiExpression description={`or`} value={field} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {this.renderFieldTypeInput(type, rowRuleValue, valueComparison.id, valueIndex)}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {this.renderFieldValueInput(type, rowRuleValue, valueComparison.id, valueIndex)}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace={true}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              onClick={() => this.onRemoveAlternateValue(valueIndex)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFormRow hasEmptyLabelSpace={true}>
            {renderAddValueButton ? (
              <EuiButton
                onClick={this.onAddAlternateValue}
                iconType="plusInCircle"
                color="primary"
                size="s"
              >
                add alternate value
              </EuiButton>
            ) : (
              <EuiSpacer />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private renderFieldTypeInput = (
    fieldType: 'number' | 'text',
    rowRuleValue: RoleMappingFieldRuleValue,
    inputType: string,
    valueIndex: number
  ) => {
    return (
      <EuiFormRow label="Type" key={valueIndex}>
        <EuiSelect
          options={[
            { value: 'text', text: 'text' },
            { value: 'number', text: 'number' },
            { value: 'null', text: 'is null' },
          ]}
          value={inputType}
          onChange={e =>
            this.onComparisonTypeChange(valueIndex, e.target.value as ComparisonOption)
          }
        />
      </EuiFormRow>
    );
  };

  private renderFieldValueInput = (
    fieldType: 'number' | 'text',
    rowRuleValue: RoleMappingFieldRuleValue,
    inputType: string,
    valueIndex: number
  ) => {
    const isNullValue = rowRuleValue === null;
    return (
      <EuiFormRow label="Value" key={valueIndex}>
        <EuiFieldText
          value={isNullValue ? '-- null --' : (rowRuleValue as string)}
          onChange={
            fieldType === 'number'
              ? this.onNumericValueChange(valueIndex)
              : this.onValueChange(valueIndex)
          }
          disabled={isNullValue}
          type={fieldType}
        />
      </EuiFormRow>
    );
  };

  private onAddAlternateValue = () => {
    const { field, value } = this.props.rule;
    const nextValue = Array.isArray(value) ? [...value] : [value];
    nextValue.push('*');
    this.props.onChange(new FieldRule(field, nextValue));
  };

  private onRemoveAlternateValue = (index: number) => {
    const { field, value } = this.props.rule;

    if (!Array.isArray(value) || value.length === 1) {
      // Only one value left. Delete entire rule instead.
      this.props.onDelete();
      return;
    }
    const nextValue = [...value];
    nextValue.splice(index, 1);
    this.props.onChange(new FieldRule(field, nextValue));
  };

  private onFieldChange = ([newField]: Array<{ label: string }>) => {
    if (!newField) {
      return;
    }

    const { value } = this.props.rule;
    this.props.onChange(new FieldRule(newField.label, value));
  };

  private onAddField = (newField: string) => {
    const { value } = this.props.rule;
    this.props.onChange(new FieldRule(newField, value));
  };

  private onValueChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const { field, value } = this.props.rule;
    let nextValue;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, e.target.value);
    } else {
      nextValue = e.target.value;
    }
    this.props.onChange(new FieldRule(field, nextValue));
  };

  private onNumericValueChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const { field, value } = this.props.rule;
    let nextValue;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, parseFloat(e.target.value));
    } else {
      nextValue = parseFloat(e.target.value);
    }
    this.props.onChange(new FieldRule(field, nextValue));
  };

  private onComparisonTypeChange = (index: number, newType: ComparisonOption) => {
    const comparison = comparisonOptions[newType];
    if (!comparison) {
      throw new Error(`Unexpected comparison type: ${newType}`);
    }
    const { field, value } = this.props.rule;
    let nextValue = value;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, comparison.defaultValue as any);
    } else {
      nextValue = comparison.defaultValue;
    }
    this.props.onChange(new FieldRule(field, nextValue));
  };

  private getComparisonType(ruleValue: RoleMappingFieldRuleValue) {
    const valueType = typeof ruleValue;
    if (valueType === 'string' || valueType === 'undefined') {
      return comparisonOptions.text;
    }
    if (valueType === 'number') {
      return comparisonOptions.number;
    }
    if (ruleValue === null) {
      return comparisonOptions.null;
    }
    throw new Error(`Unable to detect comparison type for rule value [${ruleValue}]`);
  }
}
