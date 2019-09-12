/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ResultProps {
  result: string;
}

export function Result({ result }: ResultProps) {
  return (
    <EuiToolTip
      content={i18n.translate('xpack.apm.transactionDetails.resultLabel', {
        defaultMessage: 'Result'
      })}
    >
      <EuiBadge color="default" title={undefined}>
        {result}
      </EuiBadge>
    </EuiToolTip>
  );
}
