/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiBasicTable } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import {
  certificatesSelector,
  getCertificatesActions,
} from '../../state/certificates/certificates';

const columns = [
  {
    field: 'Status',
    name: 'Status',
  },
  {
    name: 'Common Name',

    field: 'common_name',
  },
  {
    field: 'Monitors',
  },
  {
    name: 'Issued By',
    field: 'issued_by',
  },
  {
    field: 'certificate_not_valid_after',
  },
  {
    field: 'sh256',
  },
];

export const CertificateList = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCertificatesActions.get());
  }, [dispatch]);

  const certificates = useSelector(certificatesSelector);

  return <EuiBasicTable columns={columns} items={certificates ?? []} />;
};
