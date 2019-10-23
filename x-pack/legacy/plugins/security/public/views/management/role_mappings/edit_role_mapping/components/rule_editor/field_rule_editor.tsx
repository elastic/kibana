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
  EuiPopover,
  EuiPopoverTitle,
  EuiButton,
  EuiSelect,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { RoleMappingFieldRule, RoleMappingFieldRuleValue } from '../../../../../../../common/model';

interface Props {
  rule: RoleMappingFieldRule;
  onChange: (rule: RoleMappingFieldRule) => void;
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
    const [field, ruleValue] = this.extractRule(this.props.rule.field);

    const content = Array.isArray(ruleValue)
      ? ruleValue.map((v, index) =>
          index === 0
            ? this.renderPrimaryFieldRow(field, ruleValue)
            : this.renderFieldRow(field, ruleValue, index)
        )
      : [this.renderPrimaryFieldRow(field, ruleValue)];

    return (
      <EuiFlexGroup direction="column">
        {content.map((row, index) => {
          return <EuiFlexItem key={index}>{row}</EuiFlexItem>;
        })}
      </EuiFlexGroup>
    );
  }

  private renderPrimaryFieldRow = (field: string, ruleValue: RoleMappingFieldRuleValue) => {
    let renderDeleteButton = false;
    let renderAddValueButton = true;
    let rowRuleValue: RoleMappingFieldRuleValue = ruleValue;
    if (Array.isArray(ruleValue)) {
      renderDeleteButton = ruleValue.length > 1;
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
              options={fieldOptions}
            />
          </EuiFormRow>
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
              <EuiButton onClick={this.onAddAlternateValue} iconType="plusInCircle" color="primary">
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
              <EuiButton onClick={this.onAddAlternateValue} iconType="plusInCircle" color="primary">
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

  private renderFieldValueInput = (
    fieldType: 'number' | 'text',
    rowRuleValue: RoleMappingFieldRuleValue,
    inputType: string,
    valueIndex: number
  ) => {
    const popoverId = `popover_${valueIndex}`;
    return (
      <EuiFormRow label="Value" key={valueIndex}>
        <EuiFieldText
          value={(rowRuleValue as string) || '-- null --'}
          onChange={
            fieldType === 'number'
              ? this.onNumericValueChange(valueIndex)
              : this.onValueChange(valueIndex)
          }
          disabled={rowRuleValue === null}
          type={fieldType}
          prepend={
            <EuiPopover
              button={
                <EuiButtonEmpty
                  size="xs"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={this.openMatchesPopover(popoverId)}
                >
                  {inputType}
                </EuiButtonEmpty>
              }
              isOpen={this.state.openPopoverIds.includes(popoverId)}
              closePopover={this.closeMatchesPopover(popoverId)}
              ownFocus
            >
              <EuiPopoverTitle>Comparison type</EuiPopoverTitle>
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
            </EuiPopover>
          }
        />
      </EuiFormRow>
    );
  };

  private onAddAlternateValue = () => {
    const [field, value] = this.extractRule(this.props.rule.field);
    const nextValue = Array.isArray(value) ? [...value] : [value];
    nextValue.push('*');
    this.props.onChange({
      field: {
        [field]: nextValue,
      },
    });
  };

  private onRemoveAlternateValue = (index: number) => {
    const [field, value] = this.extractRule(this.props.rule.field);
    if (!Array.isArray(value)) {
      throw new TypeError('expected value to be an array');
    }
    const nextValue = [...value];
    nextValue.splice(index, 1);
    this.props.onChange({
      field: {
        [field]: nextValue,
      },
    });
  };

  private onFieldChange = ([newField]: Array<{ label: string }>) => {
    const [, value] = this.extractRule(this.props.rule.field);
    this.props.onChange({
      field: {
        [newField.label]: value,
      },
    });
  };

  private onValueChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const [field, value] = this.extractRule(this.props.rule.field);
    let nextValue;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, e.target.value);
    } else {
      nextValue = e.target.value;
    }
    this.props.onChange({
      field: {
        [field]: nextValue,
      },
    });
  };

  private onNumericValueChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const [field, value] = this.extractRule(this.props.rule.field);
    let nextValue;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, parseFloat(e.target.value));
    } else {
      nextValue = parseFloat(e.target.value);
    }
    this.props.onChange({
      field: {
        [field]: nextValue,
      },
    });
  };

  private onComparisonTypeChange = (index: number, newType: ComparisonOption) => {
    const comparison = comparisonOptions[newType];
    if (!comparison) {
      throw new Error(`Unexpected comparison type: ${newType}`);
    }
    const [field, value] = this.extractRule(this.props.rule.field);
    let nextValue = value;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, comparison.defaultValue as any);
    } else {
      nextValue = comparison.defaultValue;
    }
    this.props.onChange({
      field: {
        [field]: nextValue,
      },
    });
  };

  private extractRule(fieldRuleDef: RoleMappingFieldRule['field']) {
    const entries = Object.entries(fieldRuleDef);
    if (entries.length !== 1) {
      throw new Error(`Expected a single field rule, but found ${entries.length}`);
    }
    return entries[0];
  }

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

  private openMatchesPopover = (popoverId: string) => () =>
    this.setState({ openPopoverIds: [...this.state.openPopoverIds, popoverId] });
  private closeMatchesPopover = (popoverId: string) => () =>
    this.setState({ openPopoverIds: this.state.openPopoverIds.filter(id => id !== popoverId) });
}
