/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiBasicTable,
  EuiButton,
  EuiCopy,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import {
  certificatesSelector,
  getCertificatesActions,
} from '../../state/certificates/certificates';
import { CertStatus } from './cert_status';
import { CertMonitors } from './cert_monitors';

const columns = [
  {
    field: 'tls.certificate_not_valid_after',
    name: 'Status',
    sortable: true,
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
    render: monitors => <CertMonitors monitors={monitors} />,
  },
  {
    name: 'Issued By',
    field: 'issuer',
  },
  {
    name: 'Expiration Date',
    field: 'certificate_not_valid_after',
    sortable: true,
    align: 'center',
    render: (value: string) => {
      return moment(value).format('L LT');
    },
  },
  {
    name: (
      <EuiToolTip content="Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the client.">
        <span>
          SHA256
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    width: '100px',
    actions: [
      {
        render: item => {
          return (
            <EuiCopy textToCopy={item.sha256?.toUpperCase()}>
              {copy => (
                <EuiLink onClick={copy}>
                  <EuiIcon type="copy" content="Click to Copy SHA 256 Value" position="bottom" />
                </EuiLink>
              )}
            </EuiCopy>
          );
        },
      },
    ],
  },
];

export const CertificateList = ({ page, sort, setPage, setSort }) => {
  const certificates = useSelector(certificatesSelector);

  const onTableChange = newVal => {
    setPage(newVal.page);
    setSort(newVal.sort);
  };

  const pagination = {
    pageIndex: page.index,
    pageSize: page.size,
    totalItemCount: certificates?.total ?? 0,
    pageSizeOptions: [5, 10, 15, 20],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort,
  };

  return (
    <EuiBasicTable
      columns={columns}
      items={certificates?.certs ?? []}
      pagination={pagination}
      onChange={onTableChange}
      sorting={sorting}
    />
  );
};
