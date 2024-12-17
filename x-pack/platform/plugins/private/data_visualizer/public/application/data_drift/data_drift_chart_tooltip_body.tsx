/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TooltipCellStyle, TooltipSpec } from '@elastic/charts';
import {
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableFooter,
  TooltipTableHeader,
  TooltipTableRow,
} from '@elastic/charts';
import React from 'react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useFieldFormatter } from './charts/default_value_formatter';

const style: TooltipCellStyle = { textAlign: 'right' };
export const DataComparisonChartTooltipBody: TooltipSpec['body'] = ({ items }) => {
  const percentFormatter = useFieldFormatter(FIELD_FORMAT_IDS.PERCENT);

  const footer =
    items.length > 1 ? (
      <TooltipTableFooter>
        <TooltipTableRow>
          {<TooltipTableColorCell />}
          <TooltipTableCell style={style}>Diff</TooltipTableCell>

          <TooltipTableCell style={style}>
            {items[1].datum.doc_count - items[0].datum.doc_count}
          </TooltipTableCell>
          <TooltipTableCell style={style}>
            {percentFormatter(items[1].datum.percentage - items[0].datum.percentage)}
          </TooltipTableCell>
        </TooltipTableRow>
      </TooltipTableFooter>
    ) : null;
  return (
    <TooltipTable gridTemplateColumns={`repeat(${4}, auto)`} maxHeight={120}>
      <TooltipTableHeader>
        <TooltipTableRow>
          {<TooltipTableColorCell />}
          <TooltipTableCell style={style} />
          <TooltipTableCell>Count</TooltipTableCell>
          <TooltipTableCell>Percent</TooltipTableCell>
        </TooltipTableRow>
      </TooltipTableHeader>
      <TooltipTableBody>
        {items.map(({ label, datum, seriesIdentifier: { key }, color }) => (
          <TooltipTableRow key={`${key}-${datum.x}`}>
            {<TooltipTableColorCell color={color} />}
            <TooltipTableCell style={style}>{label}</TooltipTableCell>
            <TooltipTableCell style={style}>{datum.doc_count}</TooltipTableCell>
            <TooltipTableCell style={style}>{percentFormatter(datum.percentage)}</TooltipTableCell>
          </TooltipTableRow>
        ))}
      </TooltipTableBody>

      {footer}
    </TooltipTable>
  );
};
