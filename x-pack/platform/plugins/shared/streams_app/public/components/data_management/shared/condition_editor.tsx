/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import {
  type FilterCondition,
  getDefaultFormValueForOperator,
  getFilterOperator,
  getFilterValue,
  isCondition,
  isFilterConditionObject,
  type OperatorKeys,
  operatorToHumanReadableNameMap,
} from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import { isPlainObject } from 'lodash';
import useToggle from 'react-use/lib/useToggle';
import {
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  type EuiSelectOption,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import React, { useMemo } from 'react';
import { alwaysToEmptyEquals, emptyEqualsToAlways } from '../../../util/condition';
import type { FieldSuggestion } from './field_selector';
import { FieldSelector } from './field_selector';

export interface ConditionEditorProps {
  condition: Condition;
  status: RoutingStatus;
  onConditionChange: (condition: Condition) => void;
  fieldSuggestions?: FieldSuggestion[];
}

const operatorOptions: EuiSelectOption[] = Object.entries(operatorToHumanReadableNameMap).map(
  ([value, text]) => ({
    value,
    text,
  })
);

export function ConditionEditor(props: ConditionEditorProps) {
  const { status, onConditionChange, fieldSuggestions = [] } = props;

  const isInvalidCondition = !isCondition(props.condition);

  const condition = alwaysToEmptyEquals(props.condition);

  const isFilterCondition = isPlainObject(condition) && isFilterConditionObject(condition);

  const [usingSyntaxEditor, toggleSyntaxEditor] = useToggle(!isFilterCondition);

  const handleConditionChange = (updatedCondition: Condition) => {
    onConditionChange(emptyEqualsToAlways(updatedCondition));
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.conditionEditor.title', {
        defaultMessage: 'Condition',
      })}
      labelAppend={
        <EuiSwitch
          data-test-subj="streamsAppConditionEditorSwitch"
          label={i18n.translate('xpack.streams.conditionEditor.switch', {
            defaultMessage: 'Syntax editor',
          })}
          compressed
          checked={usingSyntaxEditor}
          onChange={toggleSyntaxEditor}
          disabled={status === 'disabled'}
        />
      }
      isInvalid={isInvalidCondition}
      error={
        isInvalidCondition
          ? i18n.translate('xpack.streams.conditionEditor.error', {
              defaultMessage: 'The condition is invalid or in unrecognized format.',
            })
          : undefined
      }
    >
      {usingSyntaxEditor ? (
        <CodeEditor
          dataTestSubj="streamsAppConditionEditorCodeEditor"
          height={200}
          languageId="json"
          value={JSON.stringify(condition, null, 2)}
          onChange={(value) => {
            try {
              handleConditionChange(JSON.parse(value));
            } catch (error: unknown) {
              // do nothing
            }
          }}
          options={{
            readOnly: status === 'disabled',
            automaticLayout: true,
          }}
        />
      ) : isFilterCondition ? (
        <FilterForm
          disabled={status === 'disabled'}
          condition={condition}
          onConditionChange={handleConditionChange}
          fieldSuggestions={fieldSuggestions}
        />
      ) : (
        <EuiCodeBlock language="json" paddingSize="m" isCopyable>
          {JSON.stringify(condition, null, 2)}
        </EuiCodeBlock>
      )}
    </EuiFormRow>
  );
}

function FilterForm(props: {
  condition: FilterCondition;
  disabled: boolean;
  onConditionChange: (condition: FilterCondition) => void;
  fieldSuggestions?: FieldSuggestion[];
}) {
  const { condition, disabled, onConditionChange, fieldSuggestions } = props;

  const operator = useMemo(() => {
    return getFilterOperator(condition);
  }, [condition]);

  const value = useMemo(() => {
    return getFilterValue(condition);
  }, [condition]);

  const handleConditionChange = (updatedCondition: Partial<FilterCondition>) => {
    onConditionChange({
      ...condition,
      ...updatedCondition,
    } as FilterCondition);
  };

  const handleValueChange = (nextValue: string | boolean) => {
    onConditionChange({
      field: condition.field,
      [operator as OperatorKeys]: nextValue,
    } as FilterCondition);
  };

  const handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperator = event.target.value;

    const existingValue = getFilterValue(condition);

    const defaultValue = getDefaultFormValueForOperator(newOperator as OperatorKeys);

    const typeChanged = typeof existingValue !== typeof defaultValue;

    onConditionChange({
      field: condition.field,
      [newOperator]: existingValue !== undefined && !typeChanged ? existingValue : defaultValue,
    } as FilterCondition);
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="streamsAppConditionEditor">
      <EuiFlexItem grow={2}>
        <FieldSelector
          value={condition.field}
          onChange={(fieldValue) => handleConditionChange({ field: fieldValue })}
          placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
            defaultMessage: 'Field',
          })}
          suggestions={fieldSuggestions}
          compressed
          disabled={disabled}
          dataTestSubj="streamsAppConditionEditorFieldText"
          autoFocus={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiSelect
          aria-label={i18n.translate('xpack.streams.filter.operator', {
            defaultMessage: 'Operator',
          })}
          data-test-subj="streamsAppConditionEditorOperator"
          options={operatorOptions}
          value={operator}
          compressed
          onChange={handleOperatorChange}
          disabled={disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        {typeof value === 'string' ? (
          <EuiFieldText
            aria-label={i18n.translate('xpack.streams.filter.value', { defaultMessage: 'Value' })}
            placeholder={i18n.translate('xpack.streams.filter.valuePlaceholder', {
              defaultMessage: 'Value',
            })}
            compressed
            value={value}
            data-test-subj="streamsAppConditionEditorValueText"
            onChange={(e) => {
              handleValueChange(e.target.value);
            }}
            disabled={disabled}
          />
        ) : typeof value === 'boolean' ? (
          <EuiSelect
            aria-label={i18n.translate('xpack.streams.conditionEditor.booleanLabel', {
              defaultMessage: 'Value',
            })}
            compressed
            options={[
              {
                value: 'true',
                text: i18n.translate('xpack.streams.conditionEditor.booleanValueTrue', {
                  defaultMessage: 'True',
                }),
              },
              {
                value: 'false',
                text: i18n.translate('xpack.streams.conditionEditor.booleanFalseValue', {
                  defaultMessage: 'False',
                }),
              },
            ]}
            value={String(value)}
            data-test-subj="streamsAppFilterFormValueBoolean"
            onChange={(e) => {
              const nextValue = e.target.value === 'true' ? true : false;
              handleValueChange(nextValue);
            }}
            disabled={disabled}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
