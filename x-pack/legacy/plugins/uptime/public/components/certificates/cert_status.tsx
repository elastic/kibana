/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { EuiHealth } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../state/selectors';
import { Cert } from '../../../common/runtime_types';

interface Props {
  cert: Cert;
}

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const {
    settings: {
      certificatesThresholds: { errorState },
    },
  } = useSelector(selectDynamicSettings);

  const expiryDate = moment(cert.certificate_not_valid_after);
  const currDate = moment();
  const valid = expiryDate.diff(currDate, 'days') > errorState;
  const invalid = expiryDate < currDate;
  const expiringSoon = valid && expiryDate.diff(currDate, 'days') < errorState;

  if (valid) {
    return <EuiHealth color="success"> OK </EuiHealth>;
  }
  if (invalid) {
    return <EuiHealth color="danger"> Expired </EuiHealth>;
  }
  return <EuiHealth color="#E9AA3C"> Expires Soon </EuiHealth>;
};
