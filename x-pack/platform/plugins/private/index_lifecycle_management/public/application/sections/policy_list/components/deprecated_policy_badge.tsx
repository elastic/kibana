/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const deprecatedPolicyTooltips = {
  badge: i18n.translate('xpack.indexLifecycleMgmt.policyTable.templateBadgeType.deprecatedLabel', {
    defaultMessage: 'Deprecated',
  }),
  badgeTooltip: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.templateBadgeType.deprecatedDescription',
    {
      defaultMessage:
        'This policy is no longer supported and might be removed in a future release. Instead, use one of the other policies available or create a new one.',
    }
  ),
};
export const DeprecatedPolicyBadge = () => {
  return (
    <EuiToolTip content={deprecatedPolicyTooltips.badgeTooltip}>
      <EuiBadge color="warning" data-test-subj="deprecatedPolicyBadge">
        {deprecatedPolicyTooltips.badge}
      </EuiBadge>
    </EuiToolTip>
  );
};
