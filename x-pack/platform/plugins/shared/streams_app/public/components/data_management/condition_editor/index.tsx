/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import {
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSelectOption,
  EuiSwitch,
} from '@elastic/eui';
import {
  BinaryFilterCondition,
  Condition,
  FilterCondition,
  isCondition,
  isNeverCondition,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { isPlainObject } from 'lodash';
import {
  ALWAYS_CONDITION,
  NEVER_CONDITION,
  alwaysToEmptyEquals,
  emptyEqualsToAlways,
} from '../../../util/condition';

export type RoutingConditionEditorProps = ConditionEditorProps;

export function RoutingConditionEditor(props: RoutingConditionEditorProps) {
  const isEnabled = !isNeverCondition(props.condition);

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
          onChange={(event) => {
            props.onConditionChange(event.target.checked ? ALWAYS_CONDITION : NEVER_CONDITION);
          }}
        />
      </EuiFormRow>
      {isEnabled && <ConditionEditor {...props} />}
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

const operatorOptions: EuiSelectOption[] = Object.entries(operatorMap).map(([value, text]) => ({
  value,
  text,
}));

export interface ConditionEditorProps {
  condition: Condition;
  onConditionChange: (condition: Condition) => void;
}

export function ConditionEditor(props: ConditionEditorProps) {
  const isInvalidCondition = !isCondition(props.condition);

  const condition = alwaysToEmptyEquals(props.condition);

  const isFilterCondition = isPlainObject(condition) && 'operator' in condition;

  const [usingSyntaxEditor, toggleSyntaxEditor] = useToggle(!isFilterCondition);

  const handleConditionChange = (updatedCondition: Condition) => {
    props.onConditionChange(emptyEqualsToAlways(updatedCondition));
  };

  return (
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
      ) : isFilterCondition ? (
        <FilterForm condition={condition} onConditionChange={handleConditionChange} />
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
  onConditionChange: (condition: FilterCondition) => void;
}) {
  const handleConditionChange = (updatedCondition: Partial<FilterCondition>) => {
    props.onConditionChange({
      ...props.condition,
      ...updatedCondition,
    } as FilterCondition);
  };

  const handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCondition: Partial<FilterCondition> = { ...props.condition };

    const newOperator = event.target.value;
    if (newOperator === 'exists' || newOperator === 'notExists') {
      if ('value' in newCondition) delete newCondition.value;
    } else if (!('value' in newCondition)) {
      (newCondition as BinaryFilterCondition).value = '';
    }

    props.onConditionChange({
      ...newCondition,
      operator: newOperator,
    } as FilterCondition);
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFieldText
        data-test-subj="streamsAppFilterFormFieldText"
        aria-label={i18n.translate('xpack.streams.filter.field', { defaultMessage: 'Field' })}
        compressed
        placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
          defaultMessage: 'Field',
        })}
        value={props.condition.field}
        onChange={(e) => {
          handleConditionChange({ field: e.target.value });
        }}
      />
      <EuiSelect
        aria-label={i18n.translate('xpack.streams.filter.operator', {
          defaultMessage: 'Operator',
        })}
        data-test-subj="streamsAppFilterFormSelect"
        options={operatorOptions}
        value={props.condition.operator}
        compressed
        onChange={handleOperatorChange}
      />
      {'value' in props.condition && (
        <EuiFieldText
          aria-label={i18n.translate('xpack.streams.filter.value', { defaultMessage: 'Value' })}
          placeholder={i18n.translate('xpack.streams.filter.valuePlaceholder', {
            defaultMessage: 'Value',
          })}
          compressed
          value={String(props.condition.value)}
          data-test-subj="streamsAppFilterFormValueText"
          onChange={(e) => {
            handleConditionChange({ value: e.target.value });
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
