/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface OverviewSectionProps {
  organizationId: string;
  connectedAt: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  organizationId,
  connectedAt,
}) => {
  const formattedDate = new Date(connectedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.overview.title"
            defaultMessage="Overview"
          />
        </h2>
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
      </EuiFlexGroup>
    </>
  );
};
