/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import React from 'react';
import { DestinationCard } from './destination_card';

interface Props {
  readonly destinations: readonly ActionPolicyDestination[];
  readonly 'data-test-subj'?: string;
}

/** Stacked detail cards for action policy destinations. */
export const DestinationCardList = ({ destinations, 'data-test-subj': dataTestSubj }: Props) => (
  <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={dataTestSubj}>
    {destinations.map((destination) => (
      <EuiFlexItem key={`${destination.type}-${destination.id}`}>
        <DestinationCard destination={destination} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
