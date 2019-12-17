/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import moment from 'moment';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

import { PingTls } from '../../../../../common/graphql/types';

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
  const certificateValidity: string | undefined = get(
    tls,
    'certificate_not_valid_after',
    undefined
  );

  const validExpiryDate = certificateValidity && !isNaN(new Date(certificateValidity).valueOf());

  return validExpiryDate && certificateValidity ? (
    <>
      <EuiSpacer size="s" />
      <TextContainer>
        <EuiText
          color="subdued"
          grow={false}
          size="s"
          aria-label={i18n.translate(
            'xpack.uptime.monitorStatusBar.sslCertificateExpiry.ariaLabel',
            {
              defaultMessage: 'SSL certificate expires',
            }
          )}
        >
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.content"
            defaultMessage="SSL certificate expires {certificateValidity}"
            values={{
              certificateValidity: moment(new Date(certificateValidity).valueOf()).fromNow(),
            }}
          />
        </EuiText>
      </TextContainer>
    </>
  ) : null;
};
