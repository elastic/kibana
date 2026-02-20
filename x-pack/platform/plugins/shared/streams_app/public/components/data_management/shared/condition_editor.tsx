/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Condition, RangeCondition } from '@kbn/streamlang';
import {
  type FilterCondition,
  getFilterOperator,
  getFilterValue,
  isArrayOperator,
  isCondition,
  type OperatorKeys,
} from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useKibana } from '../../../hooks/use_kibana';
import {
  alwaysToEmptyEquals,
  conditionNeedsValueField,
  emptyEqualsToAlways,
  getFilterConditionOperator,
  isConditionEditableInUi,
} from '../../../util/condition';
import type { Suggestion } from './autocomplete_selector';
import { AutocompleteSelector } from './autocomplete_selector';
import { OperatorSelector } from './operator_selector';
import { RangeInput } from './range_input';

const SYNTAX_EDITOR_CONDITION_CHANGE_DEBOUNCE_MS = 300;

export interface ConditionEditorProps {
  condition: Condition;
  status: RoutingStatus;
  onConditionChange: (condition: Condition) => void;
  fieldSuggestions?: Suggestion[];
  valueSuggestions?: Suggestion[];
}

export function ConditionEditor(props: ConditionEditorProps) {
  const { status, onConditionChange, fieldSuggestions = [], valueSuggestions = [] } = props;
  const { core } = useKibana();

  const isInvalidCondition = !isCondition(props.condition);

  const condition = alwaysToEmptyEquals(props.condition);

  const conditionEditableInUi = useMemo(() => isConditionEditableInUi(condition), [condition]);

  const [usingSyntaxEditor, toggleSyntaxEditor] = useToggle(!conditionEditableInUi);

  // Check if the selected field is a date type AND the operator is "in range"
  const isDateFieldWithRange = useMemo(() => {
    if (!conditionEditableInUi || fieldSuggestions.length === 0) {
      return false;
    }

    const filterCondition = condition as FilterCondition;
    const operator = getFilterOperator(filterCondition);

    if (operator !== 'range') {
      return false;
    }

    const fieldSuggestion = fieldSuggestions.find((s) => s.name === filterCondition.field);
    return fieldSuggestion?.type === 'date';
  }, [condition, conditionEditableInUi, fieldSuggestions]);

  const handleConditionChange = useCallback(
    (updatedCondition: Condition) => {
      onConditionChange(emptyEqualsToAlways(updatedCondition));
    },
    [onConditionChange]
  );

  const serializedCondition = useMemo(() => JSON.stringify(condition, null, 2), [condition]);
  const [syntaxEditorValue, setSyntaxEditorValue] = useState(serializedCondition);
  const syntaxEditorValueRef = useRef(syntaxEditorValue);
  const lastSyncedSerializedConditionRef = useRef(serializedCondition);

  const debouncedEmitConditionChange = useMemo(() => {
    return debounce(
      (nextCondition: Condition) => {
        handleConditionChange(nextCondition);
      },
      SYNTAX_EDITOR_CONDITION_CHANGE_DEBOUNCE_MS,
      { trailing: true }
    );
  }, [handleConditionChange]);

  useEffect(() => {
    return () => {
      // Make sure the last valid condition is not lost on unmount.
      debouncedEmitConditionChange.flush();
      debouncedEmitConditionChange.cancel();
    };
  }, [debouncedEmitConditionChange]);

  useEffect(() => {
    // Keep the syntax editor in sync with external condition updates, but only when the user
    // hasn't diverged from the last serialized value (so we don't clobber in-progress edits).
    if (syntaxEditorValueRef.current === lastSyncedSerializedConditionRef.current) {
      setSyntaxEditorValue(serializedCondition);
      syntaxEditorValueRef.current = serializedCondition;
    }
    lastSyncedSerializedConditionRef.current = serializedCondition;
  }, [serializedCondition]);

  const flushSyntaxEditorCondition = useCallback(() => {
    const currentValue = syntaxEditorValueRef.current;
    if (currentValue === lastSyncedSerializedConditionRef.current) {
      debouncedEmitConditionChange.cancel();
      return;
    }
    try {
      const parsed = JSON.parse(currentValue) as Condition;
      debouncedEmitConditionChange.cancel();
      handleConditionChange(parsed);
    } catch (error: unknown) {
      // do nothing
    }
  }, [debouncedEmitConditionChange, handleConditionChange]);

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
      helpText={
        isDateFieldWithRange ? (
          <FormattedMessage
            id="xpack.streams.conditionEditor.dateRangeHelpText"
            defaultMessage="You can use {dateMathLink} expressions to query date fields."
            values={{
              dateMathLink: (
                <EuiLink
                  data-test-subj="streamsAppConditionEditorDateMathLink"
                  external
                  target="_blank"
                  href={core.docLinks.links.date.dateMath}
                >
                  {i18n.translate('xpack.streams.conditionEditor.dateMathLinkLabel', {
                    defaultMessage: 'date math',
                  })}
                </EuiLink>
              ),
            }}
          />
        ) : isArrayOperator(getFilterConditionOperator(condition)) ? (
          <FormattedMessage
            id="xpack.streams.conditionEditor.arrayOperatorHelpText"
            defaultMessage="Use {includes} for array/multivalue fields. For partial matches, use {contains}."
            values={{
              includes: <strong>includes</strong>,
              contains: <strong>contains</strong>,
            }}
          />
        ) : undefined
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
          value={syntaxEditorValue}
          onChange={(value) => {
            syntaxEditorValueRef.current = value;
            setSyntaxEditorValue(value);
            try {
              const parsed = JSON.parse(value) as Condition;
              debouncedEmitConditionChange(parsed);
            } catch (error: unknown) {
              debouncedEmitConditionChange.cancel();
            }
          }}
          onBlur={flushSyntaxEditorCondition}
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
          valueSuggestions={valueSuggestions}
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
  fieldSuggestions?: Suggestion[];
  valueSuggestions?: Suggestion[];
}) {
  const { condition, disabled, onConditionChange, fieldSuggestions, valueSuggestions } = props;

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

  const handleValueChange = (nextValue: string | boolean | RangeCondition) => {
    onConditionChange({
      field: condition.field,
      [operator as OperatorKeys]: nextValue,
    } as FilterCondition);
  };

  const showValueField = useMemo(() => conditionNeedsValueField(condition), [condition]);
  const isRangeValue = typeof value === 'object' && value !== null;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="streamsAppConditionEditor">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
          <EuiFlexItem grow={2} style={{ minWidth: '120px' }}>
            <AutocompleteSelector
              value={condition.field}
              onChange={(fieldValue) => handleConditionChange({ field: fieldValue })}
              placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
                defaultMessage: 'Field',
              })}
              suggestions={fieldSuggestions}
              compressed
              disabled={disabled}
              dataTestSubj="streamsAppConditionEditorFieldText"
              showIcon={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={showValueField && !isRangeValue ? 1 : 2} style={{ minWidth: '80px' }}>
            <OperatorSelector
              condition={condition}
              onConditionChange={onConditionChange}
              compressed
              disabled={disabled}
              dataTestSubj="streamsAppConditionEditorOperator"
            />
          </EuiFlexItem>
          {showValueField && !isRangeValue ? (
            <EuiFlexItem grow={2} style={{ minWidth: '120px' }}>
              {typeof value === 'string' ? (
                <AutocompleteSelector
                  aria-label={i18n.translate('xpack.streams.filter.value', {
                    defaultMessage: 'Value',
                  })}
                  placeholder={i18n.translate('xpack.streams.filter.valuePlaceholder', {
                    defaultMessage: 'Value',
                  })}
                  suggestions={valueSuggestions}
                  compressed
                  value={value}
                  dataTestSubj="streamsAppConditionEditorValueText"
                  onChange={(newValue) => {
                    handleValueChange(newValue);
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
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>

      {showValueField && isRangeValue ? (
        <EuiFlexItem>
          <RangeInput
            value={value as RangeCondition}
            onChange={(newValue) => {
              handleValueChange(newValue);
            }}
            valueSuggestions={valueSuggestions}
            compressed
            disabled={disabled}
            dataTestSubj="streamsAppConditionEditorValueRange"
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
