/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { IntegrationList, IntegrationListItem } from '../../common/types';
import { IntegrationCard } from './integration_card';

interface ListProps {
  list: IntegrationList;
}

export function IntegrationListGrid({ list }: ListProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.map(item => (
        <GridItem key={`${item.name}-${item.version}`} {...item} />
      ))}
    </EuiFlexGrid>
  );
}

function GridItem(item: IntegrationListItem) {
  return (
    <EuiFlexItem>
      <IntegrationCard {...item} />
    </EuiFlexItem>
  );
}
