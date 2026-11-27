/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { FlyoutSection } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import { DestinationCardList } from '../destination_card/destination_card_list';

export interface ActionPolicySummaryDestinationsSectionProps {
  destinations?: ActionPolicyResponse['destinations'];
}

export const ActionPolicySummaryDestinationsSection = ({
  destinations = [],
}: ActionPolicySummaryDestinationsSectionProps) => {
  return (
    <FlyoutSection
      id="destinations"
      title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.destinations.title', {
        defaultMessage: 'Destinations',
      })}
      data-test-subj="actionPolicyDetailsFlyoutDestinations"
    >
      {destinations.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>-</p>
        </EuiText>
      ) : (
        <DestinationCardList destinations={destinations} />
      )}
    </FlyoutSection>
  );
};
