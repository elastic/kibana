/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EscalationQueueItem } from './types';

interface EscalationMetaInfoProps {
  createdAt: EscalationQueueItem['createdAt'];
  updatedAt: EscalationQueueItem['updatedAt'];
}

export const EscalationMetaInfo = memo<EscalationMetaInfoProps>(({ createdAt, updatedAt }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} direction="row">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" component="span">
          {i18n.translate('xpack.alertzero.escalationQueue.openedLabel', {
            defaultMessage: 'Opened',
          })}{' '}
          <FormattedRelative value={createdAt} />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" component="span">
          {'·'}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" component="span">
          {i18n.translate('xpack.alertzero.escalationQueue.updatedLabel', {
            defaultMessage: 'Updated',
          })}{' '}
          <FormattedRelative value={updatedAt} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

EscalationMetaInfo.displayName = 'EscalationMetaInfo';
