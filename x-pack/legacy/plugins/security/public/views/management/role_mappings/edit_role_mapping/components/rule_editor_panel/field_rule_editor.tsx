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
  EuiButtonEmpty,
  EuiSelect,
  EuiSpacer,
  EuiFieldNumber,
  EuiLink,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldRule, FieldRuleValue } from '../../../model';
import { documentationLinks } from '../../../services/documentation_links';

interface Props {
  rule: FieldRule;
  allowDelete: boolean;
  onChange: (rule: FieldRule) => void;
  onDelete: () => void;
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

type ComparisonOption = 'text' | 'number' | 'null' | 'boolean';
const comparisonOptions: Record<
  ComparisonOption,
  { id: ComparisonOption; defaultValue: FieldRuleValue }
> = {
  text: {
    id: 'text',
    defaultValue: '*',
  },
  number: {
    id: 'number',
    defaultValue: 0,
  },
  null: {
    id: 'null',
    defaultValue: null,
  },
  boolean: {
    id: 'boolean',
    defaultValue: true,
  },
};

export class FieldRuleEditor extends Component<Props, {}> {
  public render() {
    const { field, value } = this.props.rule;

    const content = Array.isArray(value)
      ? value.map((v, index) => this.renderFieldRow(field, value, index))
      : [this.renderFieldRow(field, value, 0)];

    return (
      <EuiFlexGroup direction="column">
        {content.map((row, index) => {
          return <EuiFlexItem key={index}>{row}</EuiFlexItem>;
        })}
      </EuiFlexGroup>
    );
  }

  private renderFieldRow = (field: string, ruleValue: FieldRuleValue, valueIndex: number) => {
    const isPrimaryRow = valueIndex === 0;

    let renderAddValueButton = true;
    let renderDeleteButton = !isPrimaryRow || this.props.allowDelete;
    let rowRuleValue: FieldRuleValue = ruleValue;
    if (Array.isArray(ruleValue)) {
      renderDeleteButton = ruleValue.length > 1 || this.props.allowDelete;
      renderAddValueButton = ruleValue.length - 1 === valueIndex;
      rowRuleValue = ruleValue[valueIndex];
    }

    const comparisonType = this.getComparisonType(rowRuleValue);

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={1}>
          {isPrimaryRow ? (
            <EuiFormRow
              label={i18n.translate(
                'xpack.security.management.editRoleMapping.fieldRuleEditor.userFieldLabel',
                { defaultMessage: 'User field' }
              )}
            >
              <EuiComboBox
                isClearable={false}
                selectedOptions={[{ label: field }]}
                singleSelection={{ asPlainText: true }}
                onChange={this.onFieldChange}
                onCreateOption={this.onAddField}
                options={fieldOptions}
                data-test-subj={`fieldRuleEditorField-${valueIndex} fieldRuleEditorField-${valueIndex}-combo`}
              />
            </EuiFormRow>
          ) : (
            <EuiFormRow hasEmptyLabelSpace={true}>
              <EuiExpression
                description={i18n.translate(
                  'xpack.security.management.editRoleMapping.fieldRuleEditor.orLabel',
                  { defaultMessage: 'or' }
                )}
                value={field}
                data-test-subj={`fieldRuleEditorField-${valueIndex} fieldRuleEditorField-${valueIndex}-expression`}
              />
            </EuiFormRow>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {this.renderFieldTypeInput(comparisonType.id, valueIndex)}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {this.renderFieldValueInput(comparisonType.id, rowRuleValue, valueIndex)}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace={true}>
            {renderAddValueButton ? (
              <EuiButtonIcon
                iconSize="s"
                iconType="plusInCircle"
                onClick={this.onAddAlternateValue}
                color="primary"
                data-test-subj="addAlternateValueButton"
                aria-label={i18n.translate(
                  'xpack.security.management.editRoleMapping.fieldRuleEditor.addAlternateValueButton',
                  {
                    defaultMessage: 'Add alternate value',
                  }
                )}
              />
            ) : (
              <EuiSpacer />
            )}
          </EuiFormRow>
        </EuiFlexItem>
        {renderDeleteButton && (
          <EuiFlexItem grow={1}>
            <EuiFormRow hasEmptyLabelSpace={true}>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                iconSize="s"
                data-test-subj={`fieldRuleEditorDeleteValue fieldRuleEditorDeleteValue-${valueIndex}`}
                aria-label={i18n.translate(
                  'xpack.security.management.editRoleMapping.fieldRuleEditor.deleteValueLabel',
                  {
                    defaultMessage: 'Delete value',
                  }
                )}
                onClick={() => this.onRemoveAlternateValue(valueIndex)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  private renderFieldTypeInput = (inputType: ComparisonOption, valueIndex: number) => {
    return (
      <EuiFormRow
        label={i18n.translate(
          'xpack.security.management.editRoleMapping.fieldRuleEditor.typeFormRow',
          {
            defaultMessage: 'Type',
          }
        )}
        key={valueIndex}
      >
        <EuiSelect
          options={[
            { value: 'text', text: 'text' },
            { value: 'number', text: 'number' },
            { value: 'null', text: 'is null' },
            { value: 'boolean', text: 'boolean' },
          ]}
          data-test-subj={`fieldRuleEditorValueType-${valueIndex}`}
          value={inputType}
          onChange={e =>
            this.onComparisonTypeChange(valueIndex, e.target.value as ComparisonOption)
          }
        />
      </EuiFormRow>
    );
  };

  private renderFieldValueInput = (
    fieldType: ComparisonOption,
    rowRuleValue: FieldRuleValue,
    valueIndex: number
  ) => {
    const inputField = this.getInputFieldForType(fieldType, rowRuleValue, valueIndex);

    return (
      <EuiFormRow
        label={i18n.translate(
          'xpack.security.management.editRoleMapping.fieldRuleEditor.valueFormRow',
          {
            defaultMessage: 'Value',
          }
        )}
        labelAppend={
          <EuiLink href={documentationLinks.getRoleMappingFieldRulesDocUrl()} target="_blank">
            <EuiIconTip
              type="questionInCircle"
              content={
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.fieldRuleEditor.fieldValueHelp"
                  defaultMessage="Learn more about supported field values"
                />
              }
            />
          </EuiLink>
        }
        key={valueIndex}
      >
        {inputField}
      </EuiFormRow>
    );
  };

  private getInputFieldForType = (
    fieldType: ComparisonOption,
    rowRuleValue: FieldRuleValue,
    valueIndex: number
  ) => {
    const isNullValue = rowRuleValue === null;

    const commonProps = {
      'data-test-subj': `fieldRuleEditorValue-${valueIndex}`,
    };

    switch (fieldType) {
      case 'boolean':
        return (
          <EuiSelect
            {...commonProps}
            value={rowRuleValue?.toString()}
            onChange={this.onBooleanValueChange(valueIndex)}
            options={[
              { value: 'true', text: 'true' },
              { value: 'false', text: 'false' },
            ]}
          />
        );
      case 'text':
      case 'null':
        return (
          <EuiFieldText
            {...commonProps}
            value={isNullValue ? '-- null --' : (rowRuleValue as string)}
            onChange={this.onValueChange(valueIndex)}
            disabled={isNullValue}
          />
        );
      case 'number':
        return (
          <EuiFieldNumber
            data-test-subj={`fieldRuleEditorValue-${valueIndex}`}
            value={rowRuleValue as string}
            onChange={this.onNumericValueChange(valueIndex)}
          />
        );
      default:
        throw new Error(`Unsupported input field type: ${fieldType}`);
    }
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

  private onBooleanValueChange = (index: number) => (e: ChangeEvent<HTMLSelectElement>) => {
    const boolValue = e.target.value === 'true';

    const { field, value } = this.props.rule;
    let nextValue;
    if (Array.isArray(value)) {
      nextValue = [...value];
      nextValue.splice(index, 1, boolValue);
    } else {
      nextValue = boolValue;
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

  private getComparisonType(ruleValue: FieldRuleValue) {
    const valueType = typeof ruleValue;
    if (valueType === 'string' || valueType === 'undefined') {
      return comparisonOptions.text;
    }
    if (valueType === 'number') {
      return comparisonOptions.number;
    }
    if (valueType === 'boolean') {
      return comparisonOptions.boolean;
    }
    if (ruleValue === null) {
      return comparisonOptions.null;
    }
    throw new Error(`Unable to detect comparison type for rule value [${ruleValue}]`);
  }
}
