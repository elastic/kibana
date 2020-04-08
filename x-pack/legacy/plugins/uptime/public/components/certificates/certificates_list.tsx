/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiDataGrid,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
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
    id: 'common_name',
  },
  {
    id: 'Monitors',
  },
  {
    id: 'Issued By',
  },
  {
    id: 'certificate_not_valid_after',
    defaultSortDirection: 'desc',
  },
  {
    id: 'Issued At',
  },
];


export const CertificateList = () => {

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCertificatesActions.get());
  }, [dispatch]);

  const certificates = useSelector(certificatesSelector);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id)); // initialize to the full set of columns

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      useEffect(() => {
        if (columnId === 'amount') {
          if (certificates.hasOwnProperty(rowIndex)) {
            const numeric = 1;
            setCellProps({
              style: {
                backgroundColor: `rgba(0, 255, 0, ${numeric * 0.0002})`,
              },
            });
          }
        }
      }, [rowIndex, columnId, setCellProps]);

      return certificates.hasOwnProperty(rowIndex) ? certificates[rowIndex]?.[columnId] ?? 0 : null;
    };
  }, [certificates]);

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
      toolbarVisibility={false}
    />
  );
};
