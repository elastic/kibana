/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import ReactDOM from 'react-dom';

import { ColumnType } from '../../../../../components/ml_in_memory_table';

import { ColumnChart } from './column_chart';

type RefValue = HTMLElement | null;
export function useColumnCharts(indexPattern: any, columns: ColumnType[], query: any) {
  const ref = useRef<RefValue>(null);

  return (node: RefValue) => {
    ref.current = node;

    if (node !== null) {
      const tBody = node.getElementsByTagName('tbody')[0];
      const chartRows = tBody.getElementsByClassName('transformChartRow');

      let chartRow;
      if (chartRows.length > 0) {
        chartRow = chartRows[0];
      } else {
        chartRow = document.createElement('tr');
        chartRow.classList.add('transformChartRow');
        tBody.insertBefore(chartRow, tBody.childNodes[0]);
      }

      ReactDOM.render(
        <>
          {columns.map((d, i) => (
            <td key={i}>
              {!d.isExpander && (
                <ColumnChart indexPattern={indexPattern} columnType={d} query={query} />
              )}
            </td>
          ))}
        </>,
        chartRow
      );
    }
  };
}
