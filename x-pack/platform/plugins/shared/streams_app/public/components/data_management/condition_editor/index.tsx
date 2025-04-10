/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiIconTip,
} from '@elastic/eui';
import {
  BinaryFilterCondition,
  Condition,
  FilterCondition,
  isNeverCondition,
} from '@kbn/streams-schema';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { useBoolean } from '@kbn/react-hooks';
import {
  EMPTY_EQUALS_CONDITION,
  NEVER_CONDITION,
  alwaysToEmptyEquals,
  emptyEqualsToAlways,
} from '../../../util/condition';

export function ConditionEditor(props: {
  condition: Condition;
  onConditionChange: (condition: Condition) => void;
}) {
  const condition = alwaysToEmptyEquals(props.condition);
  const isEnabled = !isNeverCondition(condition);

  const [usingSyntaxEditor, { toggle: toggleSyntaxEditor, off: closeSyntaxEditor }] = useBoolean(
    !('operator' in condition)
  );

  const handleConditionChange = (updatedCondition: Condition) => {
    props.onConditionChange(emptyEqualsToAlways(updatedCondition));
  };

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
                  'When the stream is not enabled, it does not route documents to this stream. Disabling the stream does not delete existing data.',
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
          onChange={(event) => {
            handleConditionChange(event.target.checked ? EMPTY_EQUALS_CONDITION : NEVER_CONDITION);
            closeSyntaxEditor();
          }}
        />
      </EuiFormRow>
      {isEnabled && (
        <EuiFormRow
          label={i18n.translate('xpack.streams.conditionEditor.title', {
            defaultMessage: 'Condition',
          })}
          labelAppend={
            <EuiSwitch
              label={i18n.translate('xpack.streams.conditionEditor.switch', {
                defaultMessage: 'Syntax editor',
              })}
              compressed
              checked={usingSyntaxEditor}
              onChange={toggleSyntaxEditor}
            />
          }
        >
          {usingSyntaxEditor ? (
            <CodeEditor
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
            />
          ) : 'operator' in condition ? (
            <FilterForm
              condition={condition || EMPTY_EQUALS_CONDITION}
              onConditionChange={handleConditionChange}
            />
          ) : (
            <pre>{JSON.stringify(condition, null, 2)}</pre>
          )}
        </EuiFormRow>
      )}
    </EuiForm>
  );
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
  notExists: i18n.translate('xpack.streams.filter.notExists', { defaultMessage: 'not exists' }),
};

function FilterForm(props: {
  condition: FilterCondition;
  onConditionChange: (condition: FilterCondition) => void;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow>
        <EuiFieldText
          data-test-subj="streamsAppFilterFormFieldText"
          aria-label={i18n.translate('xpack.streams.filter.field', { defaultMessage: 'Field' })}
          compressed
          placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
            defaultMessage: 'Field',
          })}
          value={props.condition.field}
          onChange={(e) => {
            props.onConditionChange({ ...props.condition, field: e.target.value });
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiSelect
          aria-label={i18n.translate('xpack.streams.filter.operator', {
            defaultMessage: 'Operator',
          })}
          data-test-subj="streamsAppFilterFormSelect"
          options={
            Object.entries(operatorMap).map(([value, text]) => ({
              value,
              text,
            })) as Array<{ value: FilterCondition['operator']; text: string }>
          }
          value={props.condition.operator}
          compressed
          onChange={(e) => {
            const newCondition: Partial<FilterCondition> = {
              ...props.condition,
            };

            const newOperator = e.target.value as FilterCondition['operator'];
            if (newOperator === 'exists' || newOperator === 'notExists') {
              if ('value' in newCondition) delete newCondition.value;
            } else if (!('value' in newCondition)) {
              (newCondition as BinaryFilterCondition).value = '';
            }
            props.onConditionChange({
              ...newCondition,
              operator: newOperator,
            } as FilterCondition);
          }}
        />
      </EuiFlexItem>

      {'value' in props.condition && (
        <EuiFlexItem grow>
          <EuiFieldText
            aria-label={i18n.translate('xpack.streams.filter.value', { defaultMessage: 'Value' })}
            placeholder={i18n.translate('xpack.streams.filter.valuePlaceholder', {
              defaultMessage: 'Value',
            })}
            compressed
            value={String(props.condition.value)}
            data-test-subj="streamsAppFilterFormValueText"
            onChange={(e) => {
              props.onConditionChange({
                ...props.condition,
                value: e.target.value,
              } as BinaryFilterCondition);
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
