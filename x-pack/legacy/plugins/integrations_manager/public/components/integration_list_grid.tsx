/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, ReactNode } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { IntegrationList, IntegrationListItem } from '../../common/types';
import { IntegrationCard, BadgeProps } from './integration_card';

type ListProps = {
  controls?: ReactNode;
  title: string;
  list: IntegrationList;
} & BadgeProps;

export function IntegrationListGrid({ controls, title, list, showInstalledBadge }: ListProps) {
  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  const gridContent = <GridColumn list={list} showInstalledBadge={showInstalledBadge} />;

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
        <EuiFlexItem grow={3}>{gridContent}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </Fragment>
  );
}

type GridItemProps = IntegrationListItem & BadgeProps;

function GridItem(item: GridItemProps) {
  return (
    <EuiFlexItem>
      <IntegrationCard {...item} showInstalledBadge={item.showInstalledBadge} />
    </EuiFlexItem>
  );
}

interface ControlsColumnProps {
  controls: ReactNode;
  title: string;
}

function ControlsColumn({ controls, title }: ControlsColumnProps) {
  return (
    <Fragment>
      <EuiText>
        <h2>{title}</h2>
      </EuiText>
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>{controls}</EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
    </Fragment>
  );
}

type GridColumnProps = {
  list: IntegrationList;
} & BadgeProps;

function GridColumn({ list, showInstalledBadge }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.map(item => (
        <GridItem
          key={`${item.name}-${item.version}`}
          {...item}
          showInstalledBadge={showInstalledBadge}
        />
      ))}
    </EuiFlexGrid>
  );
}
