/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize } from 'lodash';

interface SubscriptionBadgeProps {
  subscription: string;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ subscription }) => {
  const state = subscription.toLowerCase();
  const capitalizedSubscription = capitalize(subscription);

  switch (state) {
    case 'active':
    case 'trial':
      return <EuiBadge color="success">{capitalizedSubscription}</EuiBadge>;

    case 'inactive':
      return (
        <EuiToolTip
          position="bottom"
          content={
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.overview.inactiveSubscriptionInfo"
              defaultMessage="This organization has no active cloud subscription or trial. This may mean the trial expired or was never started."
            />
          }
        >
          <EuiBadge color="default" iconType="info" iconSide="right">
            {capitalizedSubscription}
          </EuiBadge>
        </EuiToolTip>
      );

    default:
      return <EuiBadge color="default">{capitalizedSubscription}</EuiBadge>;
  }
};
