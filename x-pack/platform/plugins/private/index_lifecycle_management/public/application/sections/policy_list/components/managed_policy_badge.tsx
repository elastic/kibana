/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const managedPolicyTooltips = {
  badge: i18n.translate('xpack.indexLifecycleMgmt.policyTable.templateBadgeType.managedLabel', {
    defaultMessage: 'Managed',
  }),
  badgeTooltip: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.templateBadgeType.managedDescription',
    {
      defaultMessage:
        'This policy is preconfigured and managed by Elastic; editing or deleting this policy might break Kibana.',
    }
  ),
};

export const ManagedPolicyBadge = () => {
  return (
    <EuiToolTip content={managedPolicyTooltips.badgeTooltip}>
      <EuiBadge color="hollow" data-test-subj="managedPolicyBadge">
        {managedPolicyTooltips.badge}
      </EuiBadge>
    </EuiToolTip>
  );
};
