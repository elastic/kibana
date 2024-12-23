/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC, ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HorizontalAlignment } from '@elastic/eui';
import { EuiBasicTable, LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '@elastic/eui';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import type { FieldDataRowProps } from '../../types';
import { isIndexBasedFieldVisConfig } from '../../types';
import { ExpandedRowPanel } from './expanded_row_panel';

const metaTableColumns = [
  {
    field: 'function',
    name: '',
    render: (_: string, metaItem: { display: ReactNode }) => metaItem.display,
    width: '25px',
    align: LEFT_ALIGNMENT as HorizontalAlignment,
  },
  {
    field: 'value',
    name: '',
    render: (v: string) => <strong>{v}</strong>,
    align: RIGHT_ALIGNMENT as HorizontalAlignment,
  },
];

const metaTableTitle = i18n.translate(
  'xpack.dataVisualizer.dataGrid.fieldExpandedRow.documentStatsTable.metaTableTitle',
  {
    defaultMessage: 'Documents stats',
  }
);

export const DocumentStatsTable: FC<FieldDataRowProps> = ({ config }) => {
  if (
    config?.stats === undefined ||
    config.stats.cardinality === undefined ||
    config.stats.count === undefined ||
    config.stats.sampleCount === undefined
  )
    return null;
  const { cardinality, count, sampleCount } = config.stats;

  const valueCount =
    count ?? (isIndexBasedFieldVisConfig(config) && config.existsInDocs === true ? undefined : 0);
  const docsPercent =
    valueCount !== undefined && sampleCount !== undefined
      ? roundToDecimalPlace((valueCount / sampleCount) * 100)
      : undefined;
  const metaTableItems = [
    {
      function: 'count',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.documentStatsTable.countLabel"
          defaultMessage="count"
        />
      ),
      value: count,
    },
    ...(docsPercent !== undefined
      ? [
          {
            function: 'percentage',
            display: (
              <FormattedMessage
                id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.documentStatsTable.percentageLabel"
                defaultMessage="percentage"
              />
            ),
            value: `${docsPercent}%`,
          },
        ]
      : []),
    {
      function: 'distinctValues',
      display: (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.documentStatsTable.distinctValueLabel"
          defaultMessage="distinct values"
        />
      ),
      value: cardinality,
    },
  ];

  return (
    <ExpandedRowPanel
      dataTestSubj={'dataVisualizerDocumentStatsContent'}
      className={'dvSummaryTable__wrapper dvPanel__wrapper'}
    >
      <ExpandedRowFieldHeader>{metaTableTitle}</ExpandedRowFieldHeader>
      <EuiBasicTable
        className={'dvSummaryTable'}
        compressed
        items={metaTableItems}
        columns={metaTableColumns}
        tableCaption={metaTableTitle}
      />
    </ExpandedRowPanel>
  );
};
