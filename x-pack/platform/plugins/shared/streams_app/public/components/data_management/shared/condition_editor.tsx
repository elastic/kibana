/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import {
  type FilterCondition,
  getFilterOperator,
  getFilterValue,
  isCondition,
  type OperatorKeys,
} from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import {
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import React, { useMemo } from 'react';
import {
  alwaysToEmptyEquals,
  emptyEqualsToAlways,
  isConditionEditableInUi,
} from '../../../util/condition';
import type { FieldSuggestion } from './field_selector';
import { FieldSelector } from './field_selector';
import { OperatorSelector } from './operator_selector';
import { conditionNeedsValueField } from '../../../util/condition';

export interface ConditionEditorProps {
  condition: Condition;
  status: RoutingStatus;
  onConditionChange: (condition: Condition) => void;
  fieldSuggestions?: FieldSuggestion[];
}

export function ConditionEditor(props: ConditionEditorProps) {
  const { status, onConditionChange, fieldSuggestions = [] } = props;

  const isInvalidCondition = !isCondition(props.condition);

  const condition = alwaysToEmptyEquals(props.condition);

  const conditionEditableInUi = useMemo(() => isConditionEditableInUi(condition), [condition]);

  const [usingSyntaxEditor, toggleSyntaxEditor] = useToggle(!conditionEditableInUi);

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
      ) : conditionEditableInUi ? (
        <FilterConditionForm
          disabled={status === 'disabled'}
          condition={condition as FilterCondition}
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

function FilterConditionForm(props: {
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

  const showValueField = useMemo(() => conditionNeedsValueField(condition), [condition]);

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
        />
      </EuiFlexItem>
      <EuiFlexItem grow={showValueField ? 1 : 2}>
        <OperatorSelector
          condition={condition}
          onConditionChange={onConditionChange}
          compressed
          disabled={disabled}
          dataTestSubj="streamsAppConditionEditorOperator"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        {showValueField ? (
          <>
            {typeof value === 'string' ? (
              <EuiFieldText
                aria-label={i18n.translate('xpack.streams.filter.value', {
                  defaultMessage: 'Value',
                })}
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
                  const nextValue = e.target.value === 'true';
                  handleValueChange(nextValue);
                }}
                disabled={disabled}
              />
            ) : null}
          </>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
