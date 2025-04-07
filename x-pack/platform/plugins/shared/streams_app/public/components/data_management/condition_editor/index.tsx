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
  EuiSelect,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import {
  BinaryFilterCondition,
  Condition,
  FilterCondition,
  isNeverCondition,
} from '@kbn/streams-schema';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { CodeEditor } from '@kbn/code-editor';
import {
  EMPTY_EQUALS_CONDITION,
  alwaysToEmptyEquals,
  emptyEqualsToAlways,
} from '../../../util/condition';

export function ConditionEditor(props: {
  condition: Condition;
  onConditionChange?: (condition: Condition) => void;
  isNew?: boolean;
}) {
  const normalizedCondition = alwaysToEmptyEquals(props.condition);

  const handleConditionChange = (condition: Condition) => {
    props.onConditionChange?.(emptyEqualsToAlways(condition));
  };

  return (
    <ConditionForm
      condition={normalizedCondition}
      onConditionChange={handleConditionChange}
      isNew={props.isNew}
    />
  );
}

export function ConditionForm(props: {
  condition: Condition;
  onConditionChange: (condition: Condition) => void;
  isNew?: boolean;
}) {
  const [syntaxEditor, setSyntaxEditor] = React.useState(() =>
    Boolean(props.condition && !('operator' in props.condition))
  );
  const [jsonCondition, setJsonCondition] = React.useState<string | null>(() =>
    JSON.stringify(props.condition, null, 2)
  );
  useEffect(() => {
    if (!syntaxEditor && props.condition) {
      setJsonCondition(JSON.stringify(props.condition, null, 2));
    }
  }, [syntaxEditor, props.condition]);
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {!props.isNew && (
        <>
          <EuiFlexItem grow>
            <EuiText
              className={css`
                font-weight: bold;
              `}
              size="xs"
            >
              {i18n.translate('xpack.streams.conditionEditor.title', { defaultMessage: 'Status' })}
            </EuiText>
          </EuiFlexItem>
          <EuiToolTip
            content={i18n.translate('xpack.streams.conditionEditor.disableTooltip', {
              defaultMessage: 'Route no documents to this stream without deleting existing data',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.streams.conditionEditor.switch', {
                defaultMessage: 'Enabled',
              })}
              compressed
              checked={!isNeverCondition(props.condition)}
              onChange={() => {
                props.onConditionChange(
                  isNeverCondition(props.condition) ? EMPTY_EQUALS_CONDITION : { never: {} }
                );
                setSyntaxEditor(false);
              }}
            />
          </EuiToolTip>
        </>
      )}
      {(props.isNew || !isNeverCondition(props.condition)) && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow>
              <EuiText
                className={css`
                  font-weight: bold;
                `}
                size="xs"
              >
                {i18n.translate('xpack.streams.conditionEditor.title', {
                  defaultMessage: 'Condition',
                })}
              </EuiText>
            </EuiFlexItem>

            <EuiSwitch
              label={i18n.translate('xpack.streams.conditionEditor.switch', {
                defaultMessage: 'Syntax editor',
              })}
              compressed
              checked={syntaxEditor}
              onChange={() => setSyntaxEditor(!syntaxEditor)}
            />
          </EuiFlexGroup>
          {syntaxEditor ? (
            <CodeEditor
              height={200}
              languageId="json"
              value={jsonCondition || ''}
              onChange={(e) => {
                setJsonCondition(e);
                try {
                  const condition = JSON.parse(e);
                  props.onConditionChange(condition);
                } catch (error: unknown) {
                  // do nothing
                }
              }}
            />
          ) : !props.condition || 'operator' in props.condition ? (
            <FilterForm
              condition={(props.condition as FilterCondition) || EMPTY_EQUALS_CONDITION}
              onConditionChange={props.onConditionChange}
            />
          ) : (
            <pre>{JSON.stringify(props.condition, null, 2)}</pre>
          )}
        </>
      )}
    </EuiFlexGroup>
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
