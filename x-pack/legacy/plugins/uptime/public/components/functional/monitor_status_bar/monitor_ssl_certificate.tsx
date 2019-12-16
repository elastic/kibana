/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

import { PingTls } from '../../../../common/graphql/types';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: PingTls | null | undefined;
}

const TextContainer = styled.div`
  margin-left: 20px;
`;

export const MonitorSSLCertificate = ({ tls }: Props) => {
  const certValidityDate = new Date(tls?.certificate_not_valid_after ?? '');

  return !isNaN(certValidityDate.valueOf()) ? (
    <>
      <EuiSpacer size="s" />
      <TextContainer>
        <EuiText
          color="secondary"
          grow={false}
          size="s"
          aria-label={i18n.translate(
            'xpack.uptime.monitorStatusBar.sslCertificateExpiry.ariaLabel',
            {
              defaultMessage: 'SSL certificate expires {validityDate}',
              values: { validityDate: moment(new Date(certValidityDate).valueOf()).fromNow() },
            }
          )}
        >
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.content"
            defaultMessage="SSL certificate expires {emphasizedText}"
            values={{
              emphasizedText: (
                <strong>{moment(new Date(certValidityDate).valueOf()).fromNow()}</strong>
              ),
            }}
          />
        </EuiText>
      </TextContainer>
    </>
  ) : null;
};
