/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
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
  ALWAYS_CONDITION,
  NEVER_CONDITION,
  getDefaultFormValueForOperator,
  getFilterOperator,
  getFilterValue,
  isCondition,
  isFilterConditionObject,
  isNeverCondition,
} from '@kbn/streamlang';
import { isPlainObject } from 'lodash';
import { alwaysToEmptyEquals, emptyEqualsToAlways } from '../../../util/condition';
import { useResizeCheckerUtils } from '../../../hooks/use_resize_checker_utils';

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

  const isFilterCondition = isPlainObject(condition) && isFilterConditionObject(condition);

  const [usingSyntaxEditor, toggleSyntaxEditor] = useToggle(!isFilterCondition);

  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();
  const divRef = useRef<HTMLDivElement>(null);

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
          data-test-subj="streamsAppConditionEditorSwitch"
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
        <div ref={divRef} style={{ width: '100%', height: 200, overflow: 'hidden' }}>
          <CodeEditor
            dataTestSubj="streamsAppConditionEditorCodeEditor"
            height={200}
            languageId="json"
            value={JSON.stringify(condition, null, 2)}
            onChange={(value) => {
              try {
                handleConditionChange(JSON.parse(value));
              } catch (error: unknown) {
              }
            }}
            editorDidMount={(editor) => {
              if (divRef.current) {
                setupResizeChecker(divRef.current, editor);
              }
            }}
            editorWillUnmount={() => destroyResizeChecker()}
          />
        </div>
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
  const operator = useMemo(() => {
    return getFilterOperator(props.condition);
  }, [props.condition]);

  const value = useMemo(() => {
    return getFilterValue(props.condition);
  }, [props.condition]);

  const handleConditionChange = (updatedCondition: Partial<FilterCondition>) => {
    props.onConditionChange({
      ...props.condition,
      ...updatedCondition,
    } as FilterCondition);
  };

  const handleValueChange = (nextValue: string | boolean) => {
    props.onConditionChange({
      field: props.condition.field,
      [operator as OperatorKeys]: nextValue,
    } as FilterCondition);
  };

  const handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperator = event.target.value;

    const existingValue = getFilterValue(props.condition);

    const defaultValue = getDefaultFormValueForOperator(newOperator as OperatorKeys);

    const typeChanged = typeof existingValue !== typeof defaultValue;

    props.onConditionChange({
      field: props.condition.field,
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
        value={props.condition.field}
        onChange={(e) => {
          handleConditionChange({ field: e.target.value });
        }}
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
      />
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
        />
      ) : null}
    </EuiFlexGroup>
  );
}
