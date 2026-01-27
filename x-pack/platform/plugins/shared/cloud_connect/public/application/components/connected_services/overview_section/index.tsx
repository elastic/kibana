/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SubscriptionBadge } from './subscription_badge';

interface OverviewSectionProps {
  organizationId: string;
  connectedAt: string;
  subscription?: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  organizationId,
  connectedAt,
  subscription,
}) => {
  const formattedDate = moment(connectedAt).format('LL');

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.overview.title"
            defaultMessage="Overview"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.overview.organizationId"
                defaultMessage="Cloud Organization ID"
              />
            </strong>{' '}
            {organizationId}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.overview.connectedOn"
                defaultMessage="Connected on"
              />
            </strong>{' '}
            {formattedDate}
          </EuiText>
        </EuiFlexItem>
        {subscription && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.cloudConnect.connectedServices.overview.subscription"
                  defaultMessage="Cloud subscription"
                />
              </strong>{' '}
              <SubscriptionBadge subscription={subscription} />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
