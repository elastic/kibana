/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { STATUS_INSTALLED, STATUS_NOT_INSTALLED } from '../../common/constants';
import {
  InstallationStatus,
  IntegrationsGroupedByStatus,
  IntegrationList,
  IntegrationListItem,
} from '../../common/types';
import { IntegrationCard } from './integration_card';

interface GridProps {
  map: IntegrationsGroupedByStatus;
}

interface ListProps {
  status: InstallationStatus;
  list: IntegrationList;
}

// Calling Object.entries(IntegrationsGroupedByStatus) gave `status: string`
// which causes a "string is not assignable to type InstallationStatus` error
// see https://github.com/Microsoft/TypeScript/issues/20322
// and https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-263132208
const entries = Object.entries as <T>(o: T) => Array<[Extract<keyof T, string>, T[keyof T]]>;

export function IntegrationsGridByStatus({ map }: GridProps) {
  return (
    <>
      {entries(map).map(([status, list]) => (
        <IntegrationListGrid key={status} status={status} list={list} />
      ))}
    </>
  );
}

export function IntegrationListGrid({ status, list }: ListProps) {
  const titles = {
    [STATUS_INSTALLED]: 'Your Integrations',
    [STATUS_NOT_INSTALLED]: 'Available Integrations',
  };
  return (
    <>
      <EuiSpacer />
      <EuiText>
        <h2>{titles[status]}</h2>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGrid gutterSize="l" columns={4}>
        {list.map(item => (
          <GridItem key={`${item.name}-${item.version}`} {...item} />
        ))}
      </EuiFlexGrid>
    </>
  );
}

function GridItem(item: IntegrationListItem) {
  return (
    <EuiFlexItem>
      <IntegrationCard {...item} />
    </EuiFlexItem>
  );
}
