/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { Cert } from '../../../../common/runtime_types';
import { CERT_STATUS, useCertStatus } from '../../../hooks';
import { EXPIRED, EXPIRES_SOON, OK } from '../../certificates/translations';

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

  const relativeDate = moment(cert?.certificate_not_valid_after).fromNow();
  const CertStatus = ({ color, text }) => {
    return (
      <EuiToolTip content={moment(cert?.certificate_not_valid_after).format('L LT')}>
        <EuiText size="s">
          <EuiIcon color={color} type="lock" size="s" />
          <Span>
            {text} {relativeDate}
          </Span>
        </EuiText>
      </EuiToolTip>
    );
  };

  if (isExpiringSoon) {
    return <CertStatus color="warning" text={EXPIRES_SOON} />;
  }
  if (isExpired) {
    return <CertStatus color="danger" text={EXPIRED} />;
  }

  return certStatus ? <CertStatus color="success" text={'Expires'} /> : <span>-</span>;
};
