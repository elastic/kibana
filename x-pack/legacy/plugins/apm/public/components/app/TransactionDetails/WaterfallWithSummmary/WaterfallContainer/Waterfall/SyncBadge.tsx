/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../style/variables';
import { i18n } from '@kbn/i18n';

const SpanBadge = styled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
`;

interface SyncBadgeProps {
  sync?: boolean;
}

export function SyncBadge({ sync }: SyncBadgeProps) {
  switch (sync) {
    case true:
      return (
        <SpanBadge>
          {i18n.translate('xpack.apm.transactionDetails.syncBadgeBlocking', {
            defaultMessage: 'blocking'
          })}
          blocking
        </SpanBadge>
      );
    case false:
      return <SpanBadge>async</SpanBadge>;
    default:
      return null;
  }
}
