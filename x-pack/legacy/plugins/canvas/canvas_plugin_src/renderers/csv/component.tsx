/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import fileSaver from 'file-saver';
import { EuiCode, EuiButton } from '@elastic/eui';

import { Datatable } from '../../../types';

interface Props {
  datatable: Datatable;
  height: number;
  width: number;
}

export const Csv: FC<Props> = ({ datatable, height, width }) => {
  const [isVisible, setIsVisible] = useState(false);

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

  const hover = () => setIsVisible(true);
  const unHover = () => setIsVisible(false);

  return (
    <div
      className="canvasCsv"
      style={{ width, height, position: 'relative' }}
      onMouseEnter={hover}
      onMouseLeave={unHover}
      onFocus={hover}
      onBlur={unHover}
    >
      <EuiCode className="canvasCsv__code">
        <pre className="canvasCsv__content">
          <p>{columns}</p>
          {rows}
        </pre>
      </EuiCode>
      <EuiButton
        className="canvasCsv__button"
        {...{ onClick }}
        size="s"
        style={{
          opacity: isVisible ? 1 : 0,
        }}
      >
        Download
      </EuiButton>
    </div>
  );
};
