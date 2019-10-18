/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, ReactNode } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { PackageList, PackageListItem } from '../../common/types';
import { PackageCard, BadgeProps } from './package_card';

type ListProps = {
  controls?: ReactNode;
  title: string;
  list: PackageList;
} & BadgeProps;

export function PackageListGrid({ controls, title, list, showInstalledBadge }: ListProps) {
  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  const gridContent = <GridColumn list={list} showInstalledBadge={showInstalledBadge} />;

  return (
    <Fragment>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
        <EuiFlexItem grow={3}>{gridContent}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
    </Fragment>
  );
}

type GridItemProps = PackageListItem & BadgeProps;

function GridItem(item: GridItemProps) {
  return (
    <EuiFlexItem>
      <PackageCard {...item} showInstalledBadge={item.showInstalledBadge} />
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
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>{controls}</EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
    </Fragment>
  );
}

type GridColumnProps = {
  list: PackageList;
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
