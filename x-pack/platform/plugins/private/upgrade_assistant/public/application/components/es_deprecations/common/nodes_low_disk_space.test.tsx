/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { NodesLowSpaceCallOut } from './nodes_low_disk_space';

describe('NodesLowSpaceCallOut', () => {
  it('renders impacted nodes list', () => {
    renderWithI18n(
      <NodesLowSpaceCallOut
        nodes={[
          { nodeId: '1', nodeName: 'node-1', available: '25%' },
          { nodeId: '2', nodeName: 'node-2', available: '10%' },
        ]}
      />
    );

    const callout = screen.getByTestId('lowDiskSpaceCallout');
    expect(callout).toHaveTextContent('Nodes with low disk space');

    const items = within(callout).getAllByTestId('impactedNodeListItem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('node-1 (25% available)');
    expect(items[1]).toHaveTextContent('node-2 (10% available)');
  });
});
