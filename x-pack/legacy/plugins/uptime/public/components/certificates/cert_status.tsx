/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { Cert } from '../../../common/runtime_types';
import { CERT_STATUS, useCertStatus } from '../../hooks';
import * as labels from './translations';

interface Props {
  cert: Cert;
}

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.certificate_not_valid_after);

  const isExpiringSoon = certStatus === CERT_STATUS.EXPIRING_SOON;

  const isExpired = certStatus === CERT_STATUS.EXPIRED;

  if (isExpiringSoon) {
    return (
      <EuiHealth color="#E9AA3C">
        <span>{labels.EXPIRES_SOON}</span>
      </EuiHealth>
    );
  }
  if (isExpired) {
    return (
      <EuiHealth color="danger">
        <span>{labels.EXPIRED}</span>
      </EuiHealth>
    );
  }

  return (
    <EuiHealth color="success">
      <span>{labels.OK}</span>
    </EuiHealth>
  );
};
