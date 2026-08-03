/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface ActionPolicyStateBadgeProps {
  policy: ActionPolicyResponse;
  isLoading: boolean;
}

export const ActionPolicyStateBadge = ({ policy, isLoading }: ActionPolicyStateBadgeProps) => {
  return (
    <EuiBadge color={policy.enabled ? 'success' : 'default'}>
      {policy.enabled
        ? i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.disabled', {
            defaultMessage: 'Disabled',
          })}
      {isLoading && (
        <>
          {' '}
          <EuiLoadingSpinner size="s" />
        </>
      )}
    </EuiBadge>
  );
};
