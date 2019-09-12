/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { idx } from '@kbn/elastic-idx/target';
import { palettes } from '@elastic/eui';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';
import { units, px, truncate, unit } from '../../../../../style/variables';
import { statusCodes } from './statusCodes';

const statusColors = {
  success: palettes.euiPaletteForStatus.colors[0],
  warning: palettes.euiPaletteForStatus.colors[4],
  error: palettes.euiPaletteForStatus.colors[9]
};

function getStatusColor(status: number) {
  const colors: { [key: string]: string } = {
    2: statusColors.success,
    3: statusColors.warning,
    4: statusColors.error,
    5: statusColors.error
  };

  return colors[status.toString().substr(0, 1)] || 'default';
}

interface HttpStatusBadgeProps {
  status: number;
}
function HttpStatusBadge({ status }: HttpStatusBadgeProps) {
  const label = i18n.translate('xpack.apm.transactionDetails.statusCode', {
    defaultMessage: 'Status code'
  });

  return (
    <EuiToolTip content={label}>
      <EuiBadge color={getStatusColor(status)}>
        {status} {statusCodes[status.toString()]}
      </EuiBadge>
    </EuiToolTip>
  );
}

const HttpInfoBadge = styled(EuiBadge)`
  margin-right: ${px(units.quarter)};
`;

const Url = styled('span')`
  display: inline-block;
  vertical-align: bottom;
  ${truncate(px(unit * 24))};
`;
interface HttpInfoProps {
  transaction: Transaction;
  url: string;
}

const Span = styled('span')`
  white-space: nowrap;
`;

export function HttpInfo({ transaction, url }: HttpInfoProps) {
  const method = (
    idx(transaction, _ => _.http.request.method) || ''
  ).toUpperCase();
  const status = idx(transaction, _ => _.http.response.status_code);

  const methodLabel = i18n.translate(
    'xpack.apm.transactionDetails.requestMethodLabel',
    {
      defaultMessage: 'Request method'
    }
  );

  return (
    <Span>
      <HttpInfoBadge title={undefined}>
        <EuiToolTip content={methodLabel}>
          <strong>{method}</strong>
        </EuiToolTip>{' '}
        <EuiToolTip content={url}>
          <Url>{url}</Url>
        </EuiToolTip>
      </HttpInfoBadge>
      {status && <HttpStatusBadge status={status} />}
    </Span>
  );
}
