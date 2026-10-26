/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { TransformStatsBar } from './transforms_stats_bar';

const mockUseEnabledFeatures = jest.fn();

jest.mock('../../../../serverless_context', () => ({
  useEnabledFeatures: () => mockUseEnabledFeatures(),
}));

jest.mock('../../../../hooks', () => ({
  useDocumentationLinks: () => ({ esNodeRoles: 'https://example.test/node-roles' }),
  useRefreshTransformList: () => jest.fn(),
}));

describe('TransformStatsBar', () => {
  beforeEach(() => {
    mockUseEnabledFeatures.mockReturnValue({ showNodeInfo: false });
  });

  test('summarizes the active filtered page', () => {
    const baseTransform = transformListRow as unknown as TransformListRow;
    const transforms = Array.from({ length: 25 }, (_, index) => ({
      ...baseTransform,
      id: `transform-${index}`,
      mode: index < 5 ? 'batch' : 'continuous',
      stats: {
        ...baseTransform.stats,
        state: index < 3 ? 'started' : 'stopped',
      },
    })) as TransformListRow[];

    renderWithI18n(
      <TransformStatsBar
        pageIndex={1}
        pageSize={10}
        transformNodes={3}
        transformsList={transforms}
      />
    );

    expect(screen.getByText('Showing 11–20 of 25 transforms')).toBeInTheDocument();
    expect(screen.getByText('5 one-time')).toBeInTheDocument();
    expect(screen.getByText('20 continuous')).toBeInTheDocument();
    expect(screen.getByText('3 started')).toBeInTheDocument();
    expect(screen.queryByText('3 nodes')).not.toBeInTheDocument();
  });

  test('includes node count when node information is enabled', () => {
    mockUseEnabledFeatures.mockReturnValue({ showNodeInfo: true });

    renderWithI18n(
      <TransformStatsBar
        pageIndex={0}
        pageSize={10}
        transformNodes={3}
        transformsList={[transformListRow as unknown as TransformListRow]}
      />
    );

    expect(screen.getByText('3 nodes')).toBeInTheDocument();
  });
});
