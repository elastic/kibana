/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import { type Investigation } from '../../types';

/**
 * No `updateIntervalInSeconds`: react-intl refuses to schedule updates once the unit
 * exceeds an hour, and the queue re-renders on its own poll anyway.
 */
export const ConversationMetaInfo = memo<{
  createdAt: Investigation['createdAt'];
}>(({ createdAt }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive direction="row">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={<FormattedDate value={createdAt} dateStyle="full" timeStyle="long" />}>
          {/* Focusable so the exact time is reachable without a pointer. */}
          <EuiText size="xs" color="subdued" component="span" tabIndex={0}>
            <FormattedRelative value={createdAt} />
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ConversationMetaInfo.displayName = 'ConversationMetaInfo';
