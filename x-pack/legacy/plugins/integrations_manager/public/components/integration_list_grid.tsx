/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { IntegrationList, IntegrationListItem } from '../../common/types';
import { IntegrationCard } from './integration_card';

interface ListProps {
  title: string;
  list: IntegrationList;
}

export function IntegrationListGrid({ title, list }: ListProps) {
  if (!list.length) return null;

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiText>
            <h2>{title}</h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiFlexGrid gutterSize="l" columns={3}>
            {list.map(item => (
              <GridItem key={`${item.name}-${item.version}`} {...item} />
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </Fragment>
  );
}

function GridItem(item: IntegrationListItem) {
  return (
    <EuiFlexItem>
      <IntegrationCard {...item} />
    </EuiFlexItem>
  );
}
