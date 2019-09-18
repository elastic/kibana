/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TimestampProps {
  transactionTimestamp: string;
}

export function Timestamp({ transactionTimestamp }: TimestampProps) {
  const timestamp = moment(transactionTimestamp).format(
    'MMM Do YYYY HH:mm:ss.SSS'
  );

  const label = i18n.translate('xpack.apm.transactionDetails.timestampLabel', {
    defaultMessage: 'Timestamp'
  });

  return (
    <EuiToolTip content={label}>
      <EuiText>{timestamp}</EuiText>
    </EuiToolTip>
  );
}
