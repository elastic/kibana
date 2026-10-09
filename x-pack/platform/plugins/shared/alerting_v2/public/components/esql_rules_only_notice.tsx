/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const esqlRulesOnlyBadge: AppHeaderBadge = {
  label: i18n.translate('xpack.alertingV2.esqlRulesOnly.badgeLabel', {
    defaultMessage: 'Universal rules only',
  }),
  color: 'hollow',
  'data-test-subj': 'esqlRulesOnlyBadge',
};

const CALLOUT_TITLE = i18n.translate('xpack.alertingV2.esqlRulesOnly.calloutTitle', {
  defaultMessage: 'Universal rules only',
});

export const EsqlRulesOnlyCallout = ({
  appId,
  description,
}: {
  appId: string;
  description: string;
}) => {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    `${ALERTING_V2_SECTION_ID}.${appId}.esqlRulesOnlyCalloutDismissed`,
    false
  );

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={CALLOUT_TITLE}
        iconType="info"
        data-test-subj="esqlRulesOnlyCallout"
        onDismiss={() => setIsDismissed(true)}
      >
        <p>{description}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
