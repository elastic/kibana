/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiDataGrid } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import {
  certificatesSelector,
  getCertificatesActions,
} from '../../state/certificates/certificates';

const columns = [
  {
    id: 'Status',
    defaultSortDirection: 'asc',
  },
  {
    display: 'Common Name',

    id: 'common_name',
  },
  {
    id: 'Monitors',
  },
  {
    display: 'Issued By',
    id: 'issued_by',
  },
  {
    id: 'certificate_not_valid_after',
  },
  {
    id: 'sh256',
  },
];

export const CertificateList = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCertificatesActions.get());
  }, [dispatch]);

  const certificates = useSelector(certificatesSelector);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      return certificates.hasOwnProperty(rowIndex)
        ? certificates[rowIndex]?.[columnId] ?? '-'
        : null;
    };
  }, [certificates]);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id)); // initialize to the full set of columns

  return (
    <EuiDataGrid
      aria-label="Data grid demo"
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={certificates?.length ?? 0}
      renderCellValue={renderCellValue}
      inMemory={{ level: 'sorting' }}
      gridStyle={{
        border: 'horizontal',
      }}
      toolbarVisibility={{
        showColumnSelector: true,
        showFullScreenSelector: false,
        showSortSelector: false,
        showStyleSelector: false,
      }}
    />
  );
};
