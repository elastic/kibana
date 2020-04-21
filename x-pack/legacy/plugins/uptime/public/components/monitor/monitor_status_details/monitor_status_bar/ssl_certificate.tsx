/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Tls } from '../../../../../common/runtime_types';
import { CERT_STATUS, useCertStatus } from '../../../../hooks/use_cert_status';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | null | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  const certStatus = useCertStatus(tls?.certificate_not_valid_after);

  const isExpiringSoon = certStatus === CERT_STATUS.EXPIRING_SOON;

  const isExpired = certStatus === CERT_STATUS.EXPIRED;

  const relativeDate = moment(tls?.certificate_not_valid_after).fromNow();

  return certStatus ? (
    <>
      <EuiSpacer size="s" />
      <EuiText
        grow={false}
        size="s"
        aria-label={
          isExpired
            ? i18n.translate(
                'xpack.uptime.monitorStatusBar.sslCertificateExpired.label.ariaLabel',
                {
                  defaultMessage: 'SSL certificate Expired {validityDate}',
                  values: { validityDate: relativeDate },
                }
              )
            : i18n.translate('xpack.uptime.monitorStatusBar.sslCertificateExpiry.label.ariaLabel', {
                defaultMessage: 'SSL certificate expires {validityDate}',
                values: { validityDate: relativeDate },
              })
        }
      >
        {isExpired ? (
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.badgeContent"
            defaultMessage="SSL certificate expired {emphasizedText}"
            values={{
              emphasizedText: <EuiBadge color={'danger'}>{relativeDate}</EuiBadge>,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.badgeContent"
            defaultMessage="SSL certificate expires {emphasizedText}"
            values={{
              emphasizedText: (
                <EuiBadge color={isExpiringSoon ? 'warning' : 'default'}>{relativeDate}</EuiBadge>
              ),
            }}
          />
        )}
      </EuiText>
    </>
  ) : null;
};
