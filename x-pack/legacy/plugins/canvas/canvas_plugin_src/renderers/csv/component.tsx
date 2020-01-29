/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import fileSaver from 'file-saver';
import { EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';

import { Datatable } from '../../../types';

interface Props {
  datatable: Datatable;
  height: number;
  width: number;
}

export const Csv: FC<Props> = ({ datatable, height, width }) => {
  const columns = datatable.columns.map(column => column.name).join(',');
  const rows = datatable.rows
    .map(row => datatable.columns.map(column => row[column.name]).join(','))
    .join('\n');
  const onClick = () => {
    const csvBlob = new Blob([columns, '\n', rows], {
      type: 'text/csv',
    });
    fileSaver.saveAs(csvBlob, `datatable.csv`);
  };

  return (
    <div className="canvasCsv" style={{ width, height, position: 'relative' }}>
      <EuiCodeBlock className="canvasCsv__code" isCopyable paddingSize="m" overflowHeight={height}>
        <pre className="canvasCsv__content">
          <p>{columns}</p>
          {rows}
        </pre>
      </EuiCodeBlock>
      <EuiButtonIcon
        {...{ onClick }}
        className="canvasCsv__button"
        iconType="exportAction"
        color="text"
      />
    </div>
  );
};
