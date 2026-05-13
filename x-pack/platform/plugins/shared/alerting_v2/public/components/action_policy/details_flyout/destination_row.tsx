/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import React from 'react';
import { WorkflowDestinationLink } from '../workflow_destination_link';

interface Props {
  destination: ActionPolicyDestination;
  name?: string;
  isDraft?: boolean;
}

export const DestinationRow = ({ destination, name, isDraft }: Props) => {
  if (destination.type === 'workflow') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="workflow">
            <WorkflowDestinationLink id={destination.id} name={name} isDraft={isDraft} />
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return null;
};
