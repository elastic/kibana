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
import { useStreamsRoutingSelector } from '../state_management/stream_routing_state_machine';
import type { RoutingDefinitionWithUIAttributes } from '../types';

export type RoutingFilterFn = (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void;

const FilterBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  context,
  onFilter,
  operator,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  context: FlattenRecord[];
  onFilter: RoutingFilterFn;
  operator: 'eq' | 'neq';
}) => {
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { currentRuleId, routing } = routingSnapshot.context;

  const currentRule = routing.find((rule) => rule.id === currentRuleId);

  const iconType = operator === 'eq' ? 'plusInCircle' : 'minusInCircle';

  const buttonTitle = i18n.translate('xpack.streams.routing.condition.filter', {
    defaultMessage: 'Add routing condition: {operator}',
    values: {
      operator: operator === 'eq' ? 'equals' : 'not equals',
    },
  });

  return (
    <Component
      onClick={() => {
        onFilter({
          ...currentRule,
          where: {
            field: columnId,
            ...(operator === 'eq'
              ? { eq: context[rowIndex][columnId] as StringOrNumberOrBoolean }
              : { neq: context[rowIndex][columnId] as StringOrNumberOrBoolean }),
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
        operator: 'eq',
      }),
    (cellActionProps: EuiDataGridColumnCellActionProps) =>
      FilterBtn({
        cellActionProps,
        context,
        onFilter,
        operator: 'neq',
      }),
  ];
}
