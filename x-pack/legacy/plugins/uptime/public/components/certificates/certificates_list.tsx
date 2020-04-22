/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Direction, EuiBasicTable, EuiCopy, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { certificatesSelector } from '../../state/certificates/certificates';
import { CertStatus } from './cert_status';
import { CertMonitors } from './cert_monitors';
import * as labels from './translations';
import { Cert, CertMonitor } from '../../../common/runtime_types';

interface Page {
  index: number;
  size: number;
}

export type CertFields =
  | 'sha256'
  | 'sha1'
  | 'issuer'
  | 'common_name'
  | 'monitors'
  | 'certificate_not_valid_after'
  | 'certificate_not_valid_before';

export interface CertSort {
  field: CertFields;
  direction: Direction;
}

interface Props {
  page: Page;
  sort: CertSort;
  onChange: (page: Page, sort: CertSort) => void;
}

const columns = [
  {
    field: 'tls.certificate_not_valid_after',
    name: labels.STATUS_COL,
    sortable: true,
    render: (val: string, item: Cert) => {
      return <CertStatus cert={item} />;
    },
  },
  {
    name: labels.COMMON_NAME_COL,
    field: 'common_name',
  },
  {
    name: labels.MONITORS_COL,
    field: 'monitors',
    render: (monitors: CertMonitor[]) => <CertMonitors monitors={monitors} />,
  },
  {
    name: labels.ISSUED_BY_COL,
    field: 'issuer',
  },
  {
    name: labels.EXP_DATE_COL,
    field: 'certificate_not_valid_after',
    sortable: true,
    render: (value: string) => {
      return moment(value).format('L LT');
    },
  },
  {
    name: (
      <EuiToolTip
        content="Certificate fingerprint using the SHA256 digest of DER-encoded version
      of certificate offered by the client."
      >
        <span>
          SHA256
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    width: '100px',
    actions: [
      {
        render: (item: Cert) => {
          return (
            <EuiCopy textToCopy={item.sha256?.toUpperCase()}>
              {copy => (
                <EuiLink onClick={copy}>
                  <EuiIcon type="copy" title="Click to Copy SHA 256 Value" />
                </EuiLink>
              )}
            </EuiCopy>
          );
        },
      },
    ],
  },
];

export const CertificateList: React.FC<Props> = ({ page, sort, onChange }) => {
  const certificates = useSelector(certificatesSelector);

  const onTableChange = (newVal: Partial<Props>) => {
    onChange(newVal.page as Page, newVal.sort as CertSort);
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
      sorting={{
        sort: {
          field: sort.field,
          direction: sort.direction,
        },
      }}
    />
  );
};
