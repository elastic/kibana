/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { units, px, truncate, unit } from '../../../../style/variables';
import { HttpStatusBadge } from '../HttpStatusBadge';

const HttpInfoBadge = styled(EuiBadge)`
  margin-right: ${px(units.quarter)};
`;

const Url = styled('span')`
  display: inline-block;
  vertical-align: bottom;
  ${truncate(px(unit * 24))};
`;
interface HttpInfoProps {
  method?: string;
  status?: number;
  url: string;
}

const Span = styled('span')`
  white-space: nowrap;
`;

export function HttpInfoSummaryItem({ status, method, url }: HttpInfoProps) {
  if (!url) {
    return null;
  }

  const methodLabel = i18n.translate(
    'xpack.apm.transactionDetails.requestMethodLabel',
    {
      defaultMessage: 'Request method'
    }
  );

  return (
    <Span>
      <HttpInfoBadge title={undefined}>
        {method && (
          <EuiToolTip content={methodLabel}>
            <>{method.toUpperCase()}</>
          </EuiToolTip>
        )}{' '}
        <EuiToolTip content={url}>
          <Url>{url}</Url>
        </EuiToolTip>
      </HttpInfoBadge>
      {status && <HttpStatusBadge status={status} />}
    </Span>
  );
}
