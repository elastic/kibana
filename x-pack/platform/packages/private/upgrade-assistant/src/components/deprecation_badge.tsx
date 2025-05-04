/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';

const i18nTexts = {
  criticalBadgeLabel: i18n.translate('xpack.upgradeAssistant.deprecationBadge.criticalBadgeLabel', {
    defaultMessage: 'Critical',
  }),
  resolvedBadgeLabel: i18n.translate('xpack.upgradeAssistant.deprecationBadge.resolvedBadgeLabel', {
    defaultMessage: 'Resolved',
  }),
  warningBadgeLabel: i18n.translate('xpack.upgradeAssistant.deprecationBadge.warningBadgeLabel', {
    defaultMessage: 'Warning',
  }),
};

interface Props {
  isCritical: boolean;
  isResolved?: boolean;
}

export const DeprecationBadge: FunctionComponent<Props> = ({ isCritical, isResolved }) => {
  if (isResolved) {
    return (
      <EuiBadge color="success" data-test-subj="resolvedDeprecationBadge">
        {i18nTexts.resolvedBadgeLabel}
      </EuiBadge>
    );
  }

  if (isCritical) {
    return (
      <EuiBadge color="danger" data-test-subj="criticalDeprecationBadge">
        {i18nTexts.criticalBadgeLabel}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="default" data-test-subj="warningDeprecationBadge">
      {i18nTexts.warningBadgeLabel}
    </EuiBadge>
  );
};
