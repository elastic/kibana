/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import {
  InstallationStatus,
  IntegrationsGroupedByStatus,
  IntegrationList,
  IntegrationListItem,
} from '../../common/types';
import { entries } from '../../common/type_utils';
import { IntegrationCard } from './integration_card';

interface GridProps {
  map: IntegrationsGroupedByStatus;
}

interface ListProps {
  status: InstallationStatus;
  list: IntegrationList;
}

export function IntegrationsGridByStatus({ map }: GridProps) {
  if (!map) return null;
  return (
    <Fragment>
      {entries(map).map(([status, list]) => (
        <IntegrationListGrid key={status} status={status} list={list} />
      ))}
    </Fragment>
  );
}

export function IntegrationListGrid({ status, list }: ListProps) {
  const titles: Record<InstallationStatus, string> = {
    installed: 'Your Integrations',
    not_installed: 'Available Integrations',
  };
  return (
    <Fragment>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiText>
            <h2>{titles[status]}</h2>
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
      <EuiSpacer />
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
