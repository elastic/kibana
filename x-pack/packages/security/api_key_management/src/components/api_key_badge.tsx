/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

export interface ApiKeyBadgeProps {
  type: 'rest' | 'cross_cluster' | 'managed';
}

export const ApiKeyBadge: FunctionComponent<ApiKeyBadgeProps> = ({ type }) => {
  return type === 'cross_cluster' ? (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.crossClusterDescription"
          defaultMessage="Allows remote clusters to connect to your local cluster."
        />
      }
    >
      <EuiBadge color="hollow" iconType="cluster">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.crossClusterLabel"
          defaultMessage="Cross-Cluster"
        />
      </EuiBadge>
    </EuiToolTip>
  ) : type === 'managed' ? (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.managedDescription"
          defaultMessage="Created and managed by Kibana to correctly run background tasks."
        />
      }
    >
      <EuiBadge color="hollow" iconType="gear">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.managedTitle"
          defaultMessage="Managed"
        />
      </EuiBadge>
    </EuiToolTip>
  ) : (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.restDescription"
          defaultMessage="Allows external services to access the Elastic Stack on behalf of a user."
        />
      }
    >
      <EuiBadge color="hollow" iconType="user">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.restTitle"
          defaultMessage="Personal"
        />
      </EuiBadge>
    </EuiToolTip>
  );
};
