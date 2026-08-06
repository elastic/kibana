/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FeedbackSubmitted: React.FC = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="checkInCircleFilled" color="success" size="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">
        <span>
          {i18n.translate('xpack.agentBuilder.feedback.submitted', {
            defaultMessage: 'Thanks for your feedback',
          })}
        </span>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
