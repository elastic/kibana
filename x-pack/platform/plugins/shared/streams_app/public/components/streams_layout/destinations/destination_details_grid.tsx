/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiText } from '@elastic/eui';

interface DestinationDetailItem {
  title: React.ReactNode;
  description: React.ReactNode;
}

/**
 * The details of a destination side by side, two to a row, each as a subdued title over its value,
 * for the configuration panel of the flyout, where a single column of labels would leave most of
 * the width empty. The cards of the destinations grid keep the vertical list.
 */
export const DestinationDetailsGrid = ({ items }: { items: DestinationDetailItem[] }) => (
  <EuiFlexGrid columns={2} gutterSize="l" responsive={false}>
    {items.map(({ title, description }, index) => (
      <EuiFlexItem key={index}>
        <EuiText size="s" color="subdued">
          <h4>{title}</h4>
        </EuiText>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);
