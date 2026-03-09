/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import type { NotificationPolicyDestination } from '@kbn/alerting-v2-schemas';
import React from 'react';

export const NotificationPolicyDestinationBadge = ({
  destination,
}: {
  destination: NotificationPolicyDestination;
}) => {
  switch (destination.type) {
    case 'workflow':
      return (
        <EuiBadge color="primary" iconType="logoWorkflows">
          {destination.id}
        </EuiBadge>
      );
    default:
      return null;
  }
};
