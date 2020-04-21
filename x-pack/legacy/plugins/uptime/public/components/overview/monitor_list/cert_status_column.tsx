/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiHealth, EuiIcon, EuiText } from '@elastic/eui';
import { Cert } from '../../../../common/runtime_types';
import { CERT_STATUS, useCertStatus } from '../../../hooks';

interface Props {
  cert: Cert;
}

const Span = styled.span`
  margin-left: 5px;
  vertical-align: middle;
`;

export const CertStatusColumn: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.certificate_not_valid_after);

  const isExpiringSoon = certStatus === CERT_STATUS.EXPIRING_SOON;

  const isExpired = certStatus === CERT_STATUS.EXPIRED;

  if (isExpiringSoon) {
    return (
      <EuiText size="s">
        <EuiIcon color="#E9AA3C" type="lock" size="s" />
        <Span>Expires Soon</Span>
      </EuiText>
    );
  }
  if (isExpired) {
    return (
      <EuiText size="s">
        <EuiIcon color="danger" type="lock" size="s" />
        <Span>Expired</Span>
      </EuiText>
    );
  }

  return certStatus ? (
    <EuiText size="s">
      <EuiIcon color="success" type="lock" size="s" />
      <Span>OK</Span>
    </EuiText>
  ) : (
    '-'
  );
};
