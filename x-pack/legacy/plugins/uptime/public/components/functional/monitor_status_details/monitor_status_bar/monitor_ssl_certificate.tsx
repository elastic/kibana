/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { EuiSpacer, EuiText, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Tls } from '../../../../../common/runtime_types';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | null | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  const certValidityDate = new Date(tls?.certificate_not_valid_after ?? '');

  const isValidDate = !isNaN(certValidityDate.valueOf());

  const dateIn30Days = moment().add('30', 'days');

  const isExpiringInMonth = isValidDate && dateIn30Days > moment(certValidityDate);

  return isValidDate ? (
    <>
      <EuiSpacer size="s" />
      <EuiText
        grow={false}
        size="s"
        aria-label={i18n.translate(
          'xpack.uptime.monitorStatusBar.sslCertificateExpiry.label.ariaLabel',
          {
            defaultMessage: 'SSL certificate expires {validityDate}',
            values: { validityDate: moment(certValidityDate).fromNow() },
          }
        )}
      >
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.badgeContent"
          defaultMessage="SSL certificate expires {emphasizedText}"
          values={{
            emphasizedText: (
              <EuiBadge color={isExpiringInMonth ? 'warning' : 'default'}>
                {moment(certValidityDate).fromNow()}
              </EuiBadge>
            ),
          }}
        />
      </EuiText>
    </>
  ) : null;
};
