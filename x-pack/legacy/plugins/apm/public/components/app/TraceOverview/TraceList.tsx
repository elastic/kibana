/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ITransactionGroup } from '../../../../server/lib/transaction_groups/transform';
import { fontSizes, truncate } from '../../../style/variables';
import { asMillis } from '../../../utils/formatters';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { ImpactBar } from '../../shared/ImpactBar';
import { TransactionLink } from '../../shared/Links/TransactionLink';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';

const StyledTransactionLink = styled(TransactionLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: ITransactionGroup[];
  isLoading: boolean;
}

const traceListColumns: Array<ITableColumn<ITransactionGroup>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.apm.tracesTable.nameColumnLabel', {
      defaultMessage: 'Name'
    }),
    width: '40%',
    sortable: true,
    render: (name: string, group: ITransactionGroup) => (
      <EuiToolTip id="trace-transaction-link-tooltip" content={name}>
        <StyledTransactionLink transaction={group.sample}>
          {name}
        </StyledTransactionLink>
      </EuiToolTip>
    )
  },
  {
    field: 'sample.service.name',
    name: i18n.translate(
      'xpack.apm.tracesTable.originatingServiceColumnLabel',
      {
        defaultMessage: 'Originating service'
      }
    ),
    sortable: true
  },
  {
    field: 'averageResponseTime',
    name: i18n.translate('xpack.apm.tracesTable.avgResponseTimeColumnLabel', {
      defaultMessage: 'Avg. response time'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillis(value)
  },
  {
    field: 'transactionsPerMinute',
    name: i18n.translate('xpack.apm.tracesTable.tracesPerMinuteColumnLabel', {
      defaultMessage: 'Traces per minute'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) =>
      `${value.toLocaleString()} ${i18n.translate(
        'xpack.apm.tracesTable.tracesPerMinuteUnitLabel',
        {
          defaultMessage: 'tpm'
        }
      )}`
  },
  {
    field: 'impact',
    name: i18n.translate('xpack.apm.tracesTable.impactColumnLabel', {
      defaultMessage: 'Impact'
    }),
    width: '20%',
    align: 'right',
    sortable: true,
    render: (value: number) => <ImpactBar value={value} />
  }
];

const noItemsMessage = (
  <EmptyMessage
    heading={i18n.translate('xpack.apm.tracesTable.notFoundLabel', {
      defaultMessage: 'No traces found for this query'
    })}
  />
);

export function TraceList({ items = [], isLoading }: Props) {
  const noItems = isLoading ? null : noItemsMessage;
  return (
    <ManagedTable
      columns={traceListColumns}
      items={items}
      initialSort={{ field: 'impact', direction: 'desc' }}
      noItemsMessage={noItems}
      initialPageSize={25}
    />
  );
}
