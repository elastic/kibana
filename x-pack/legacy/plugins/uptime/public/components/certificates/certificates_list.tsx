/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiBasicTable, EuiButton, EuiCopy, EuiIcon, EuiIconTip, EuiLink } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import {
  certificatesSelector,
  getCertificatesActions,
} from '../../state/certificates/certificates';
import { CertStatus } from './cert_status';

const columns = [
  {
    field: 'Status',
    name: 'Status',
    render: (val, item) => {
      return <CertStatus cert={item} />;
    },
  },
  {
    name: 'Common Name',

    field: 'common_name',
  },
  {
    name: 'Monitors',
    field: 'monitors',
    render: monitors => {
      return monitors.map(({ id, name }) => name || id).join();
    },
  },
  {
    name: 'Issued By',
    field: 'issuer',
  },
  {
    name: 'Expiration Date',
    field: 'certificate_not_valid_after',
    render: (value: string) => {
      return moment(value).format('L LT');
    },
  },
  {
    name: 'SH256',
    actions: [
      {
        render: item => {
          return (
            <EuiCopy textToCopy={item.sha256?.toUpperCase()}>
              {copy => (
                <EuiLink onClick={copy}>
                  <EuiIconTip type="copy" content="Click to Copy SHA 256 Value" position="bottom" />
                </EuiLink>
              )}
            </EuiCopy>
          );
        },
      },
    ],
  },
];

export const CertificateList = ({ page, setPage }) => {
  const certificates = useSelector(certificatesSelector);

  const onTableChange = newVal => {
    setPage(newVal.page);
  };

  const pagination = {
    pageIndex: page.index,
    pageSize: page.size,
    totalItemCount: certificates?.total ?? 0,
    pageSizeOptions: [5, 10, 15, 20],
    hidePerPageOptions: false,
  };

  return (
    <EuiBasicTable
      columns={columns}
      items={certificates?.certs ?? []}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};
