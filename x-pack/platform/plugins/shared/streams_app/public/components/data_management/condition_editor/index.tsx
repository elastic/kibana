/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { Condition, FilterCondition, OperatorKeys } from '@kbn/streamlang';
import {
  getDefaultFormValueForOperator,
  getFilterOperator,
  getFilterValue,
  isCondition,
  isFilterConditionObject,
} from '@kbn/streamlang';
import { isPlainObject } from 'lodash';
import type { RoutingDefinition, RoutingStatus } from '@kbn/streams-schema';
import { isRoutingEnabled } from '@kbn/streams-schema';
import { alwaysToEmptyEquals, emptyEqualsToAlways } from '../../../util/condition';

type RoutingConditionChangeParams = Omit<RoutingDefinition, 'destination'>;

export type RoutingConditionEditorProps = ConditionEditorProps & {
  onStatusChange: (params: RoutingConditionChangeParams['status']) => void;
};

export function RoutingConditionEditor(props: RoutingConditionEditorProps) {
  const isEnabled = isRoutingEnabled(props.status);

  return (
    <EuiForm fullWidth>
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {i18n.translate('xpack.streams.conditionEditor.title', {
              defaultMessage: 'Status',
            })}
            <EuiIconTip
              content={i18n.translate('xpack.streams.conditionEditor.disableTooltip', {
                defaultMessage:
                  'When disabled, the routing rule stops sending documents to this stream. It does not remove existing data.',
              })}
            />
          </EuiFlexGroup>
        }
      >
        <EuiSwitch
          label={i18n.translate('xpack.streams.conditionEditor.switch', {
            defaultMessage: 'Enabled',
          })}
          compressed
          checked={isEnabled}
          onChange={(event) => props.onStatusChange(event.target.checked ? 'enabled' : 'disabled')}
        />
      </EuiFormRow>
      <ConditionEditor {...props} />
    </EuiForm>
  );
}

export type ProcessorConditionEditorProps = Omit<ConditionEditorProps, 'status'>;

export function ProcessorConditionEditorWrapper(props: ProcessorConditionEditorProps) {
  return <ConditionEditor status="enabled" {...props} />;
}

const operatorMap = {
  eq: i18n.translate('xpack.streams.filter.equals', { defaultMessage: 'equals' }),
  neq: i18n.translate('xpack.streams.filter.notEquals', { defaultMessage: 'not equals' }),
  lt: i18n.translate('xpack.streams.filter.lessThan', { defaultMessage: 'less than' }),
  lte: i18n.translate('xpack.streams.filter.lessThanOrEquals', {
    defaultMessage: 'less than or equals',
  }),
  gt: i18n.translate('xpack.streams.filter.greaterThan', { defaultMessage: 'greater than' }),
  gte: i18n.translate('xpack.streams.filter.greaterThanOrEquals', {
    defaultMessage: 'greater than or equals',
  }),
  contains: i18n.translate('xpack.streams.filter.contains', { defaultMessage: 'contains' }),
  startsWith: i18n.translate('xpack.streams.filter.startsWith', { defaultMessage: 'starts with' }),
  endsWith: i18n.translate('xpack.streams.filter.endsWith', { defaultMessage: 'ends with' }),
  exists: i18n.translate('xpack.streams.filter.exists', { defaultMessage: 'exists' }),
};

const operatorOptions: EuiSelectOption[] = Object.entries(operatorMap).map(([value, text]) => ({
  value,
  text,
}));

interface ConditionEditorProps {
  condition: Condition;
  status: RoutingStatus;
  onConditionChange: (condition: Condition) => void;
}

export function ConditionEditor(props: ConditionEditorProps) {
  const { status, onConditionChange } = props;

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
}) {
  const { condition, disabled, onConditionChange } = props;

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
      <EuiFieldText
        data-test-subj="streamsAppConditionEditorFieldText"
        aria-label={i18n.translate('xpack.streams.filter.field', { defaultMessage: 'Field' })}
        compressed
        placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
          defaultMessage: 'Field',
        })}
        value={condition.field}
        onChange={(e) => {
          handleConditionChange({ field: e.target.value });
        }}
        disabled={disabled}
      />
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
      {typeof value === 'string' || typeof value === 'number' ? (
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
    </EuiFlexGroup>
  );
}
