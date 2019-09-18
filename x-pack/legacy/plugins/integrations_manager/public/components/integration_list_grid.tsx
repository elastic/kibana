/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, ReactNode } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { IntegrationList, IntegrationListItem } from '../../common/types';
import { IntegrationCard } from './integration_card';

interface ListProps {
  controls: ReactNode;
  title: string;
  list: IntegrationList;
}

export function IntegrationListGrid({ controls, title, list }: ListProps) {
  if (!list.length) return null;

  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  const gridContent = <GridColumn list={list} />;

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

function GridItem(item: IntegrationListItem) {
  return (
    <EuiFlexItem>
      <IntegrationCard {...item} />
    </EuiFlexItem>
  );
}

function ControlsColumn({ controls, title }: { controls: ReactNode; title: string }) {
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

function GridColumn({ list }: { list: IntegrationList }) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.map(item => (
        <GridItem key={`${item.name}-${item.version}`} {...item} />
      ))}
    </EuiFlexGrid>
  );
}
