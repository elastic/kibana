/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StringOrNumberOrBoolean } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import React from 'react';
import {
  selectCurrentRule,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';
import type { RoutingDefinitionWithUIAttributes } from '../types';

type BtnMode = '+' | '-';
type FilterOperator = 'eq' | 'neq' | 'exist';
export type RoutingFilterFn = (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void;

const getOperator = (value: StringOrNumberOrBoolean, mode: BtnMode): FilterOperator => {
  if (typeof value === 'boolean') {
    return 'exist';
  }

  return mode === '+' ? 'eq' : 'neq';
};

const getCondition = (value: StringOrNumberOrBoolean, operator: FilterOperator) => {
  if (typeof value === 'boolean') {
    return { exist: value };
  }

  return { [operator]: `${value}` };
};

const FilterBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  context,
  onFilter,
  mode,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  context: FlattenRecord[];
  onFilter: RoutingFilterFn;
  mode: BtnMode;
}) => {
  const currentRule = useStreamsRoutingSelector((snapshot) => selectCurrentRule(snapshot.context));

  const iconType = mode === '+' ? 'plusInCircle' : 'minusInCircle';
  const operator = getOperator(context[rowIndex][columnId] as StringOrNumberOrBoolean, mode);
  const condition = getCondition(context[rowIndex][columnId] as StringOrNumberOrBoolean, operator);

  const buttonTitle = i18n.translate('xpack.streams.routing.condition.filter', {
    defaultMessage: 'Add routing condition: {operator}',
    values: {
      operator: operator === 'eq' ? 'equals' : operator === 'neq' ? 'not equals' : 'exists',
    },
  });

  return (
    <Component
      onClick={() => {
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
      data-test-subj="routingConditionFilterForButton"
    />
  );
};

export function buildCellActions(context: FlattenRecord[], onFilter: RoutingFilterFn) {
  return [
    (cellActionProps: EuiDataGridColumnCellActionProps) =>
      FilterBtn({
        cellActionProps,
        context,
        onFilter,
        mode: '+',
      }),
    (cellActionProps: EuiDataGridColumnCellActionProps) =>
      FilterBtn({
        cellActionProps,
        context,
        onFilter,
        mode: '-',
      }),
  ];
}
