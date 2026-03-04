/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StringOrNumberOrBoolean, OperatorKeys } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import React from 'react';
import {
  selectCurrentRule,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';
import type { RoutingDefinitionWithUIAttributes } from '../types';

type BtnMode = '+' | '-';
type FilterOperator = Extract<OperatorKeys, 'eq' | 'neq' | 'exists'>;
export type RoutingFilterFn = (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void;

const getOperator = (value: StringOrNumberOrBoolean, mode: BtnMode): FilterOperator => {
  if (value === undefined) {
    return 'exists';
  }

  return mode === '+' ? 'eq' : 'neq';
};

const getCondition = (value: StringOrNumberOrBoolean, operator: FilterOperator, mode: BtnMode) => {
  if (value === undefined) {
    return { exists: mode === '+' ? false : true };
  }

  return { [operator]: `${value}` };
};

const FilterBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  context,
  onCreate,
  onFilter,
  mode,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  context: FlattenRecord[];
  onCreate: () => void;
  onFilter: RoutingFilterFn;
  mode: BtnMode;
}) => {
  const isRuleActive = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({
      ready: { ingestMode: { creatingNewRule: 'changing' } },
    })
  );
  const currentRule = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({
      ready: { ingestMode: { creatingNewRule: 'changing' } },
    })
      ? selectCurrentRule(snapshot.context)
      : {}
  );

  const iconType = mode === '+' ? 'plusInCircle' : 'minusInCircle';
  const operator = getOperator(context[rowIndex][columnId] as StringOrNumberOrBoolean, mode);
  const condition = getCondition(
    context[rowIndex][columnId] as StringOrNumberOrBoolean,
    operator,
    mode
  );

  const buttonTitle = i18n.translate('xpack.streams.routing.condition.filter', {
    defaultMessage: 'Add routing condition: {operator}',
    values: {
      operator: operator === 'eq' ? 'equals' : operator === 'neq' ? 'not equals' : 'exists',
    },
  });

  const testSubj = mode === '+' ? 'streamsAppCellActionFilterFor' : 'streamsAppCellActionFilterOut';

  return (
    <Component
      onClick={() => {
        if (!isRuleActive) {
          onCreate();
        }
        onFilter({
          ...currentRule,
          where: {
            field: columnId,
            ...condition,
          },
        });
      }}
      iconType={iconType}
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj={testSubj}
    />
  );
};

export function buildCellActions(
  context: FlattenRecord[],
  onCreate: () => void,
  onFilter: RoutingFilterFn
) {
  return [
    (cellActionProps: EuiDataGridColumnCellActionProps) =>
      FilterBtn({
        cellActionProps,
        context,
        onCreate,
        onFilter,
        mode: '+',
      }),
    (cellActionProps: EuiDataGridColumnCellActionProps) =>
      FilterBtn({
        cellActionProps,
        context,
        onCreate,
        onFilter,
        mode: '-',
      }),
  ];
}
