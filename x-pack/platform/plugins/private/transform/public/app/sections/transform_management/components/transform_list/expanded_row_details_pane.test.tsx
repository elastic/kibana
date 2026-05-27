/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import moment from 'moment-timezone';
import React from 'react';

import type { TransformListRow } from '../../../../common';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';
import { ExpandedRowDetailsPane } from './expanded_row_details_pane';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { useGetTransformStats } from '../../../../hooks';
import { useEnabledFeatures } from '../../../../serverless_context';

jest.mock('../../../../hooks', () => ({
  useGetTransformStats: jest.fn(),
}));

jest.mock('../../../../serverless_context', () => ({
  useEnabledFeatures: jest.fn(),
}));

const mockUseGetTransformStats = useGetTransformStats as jest.MockedFunction<
  typeof useGetTransformStats
>;
const mockUseEnabledFeatures = useEnabledFeatures as jest.MockedFunction<typeof useEnabledFeatures>;

describe('Transform: Transform List Expanded Row <ExpandedRowDetailsPane />', () => {
  const onAlertEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEnabledFeatures.mockReturnValue({ showNodeInfo: false });

    // Set timezone to US/Eastern for consistent test results.
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('renders basic sections from list row stats', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByTestId('transformDetailsTabContent')).toBeInTheDocument();

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByText('Checkpointing')).toBeInTheDocument();

    expect(screen.getByText('transform_id')).toBeInTheDocument();
    expect(screen.getAllByText(item.id).length).toBeGreaterThan(0);
    expect(screen.getByText('source_index')).toBeInTheDocument();
    expect(screen.getByText('farequote-2019')).toBeInTheDocument();
    expect(screen.getByText('destination_index')).toBeInTheDocument();
    expect(screen.getAllByText('fq_date_histogram_1m_1441').length).toBeGreaterThan(0);

    expect(screen.getByText('state')).toBeInTheDocument();
    expect(screen.getByText('stopped')).toBeInTheDocument();

    expect(screen.getByText('last.timestamp_millis')).toBeInTheDocument();
    expect(screen.getByText('1564388281199')).toBeInTheDocument();
  });

  test('displays source_index when index is a string', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        source: {
          ...transformListRow.config.source,
          index: 'source-index-1',
        },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('source_index')).toBeInTheDocument();
    expect(screen.getByText('source-index-1')).toBeInTheDocument();
  });

  test('displays source_index when index is an array', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        source: {
          ...transformListRow.config.source,
          index: ['source-a', 'source-b', 'source-c'],
        },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('source_index')).toBeInTheDocument();
    expect(screen.getByText('source-a')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('transformSourceIndexBadge'));

    const popover = screen.getByTestId('transformSourceIndexPopover');
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText('source-a')).toBeInTheDocument();
    expect(within(popover).getByText('source-b')).toBeInTheDocument();
    expect(within(popover).getByText('source-c')).toBeInTheDocument();
  });

  test('shows error callout when extended stats request fails', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(
      screen.getByText(
        'An error occurred fetching the extended stats for this transform. Basic stats are displayed instead.'
      )
    ).toBeInTheDocument();
  });

  test('renders node info when enabled and available', () => {
    mockUseEnabledFeatures.mockReturnValue({ showNodeInfo: true });
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      stats: {
        ...transformListRow.stats,
        node: { name: 'transform-node-1' },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('node.name')).toBeInTheDocument();
    expect(screen.getByText('transform-node-1')).toBeInTheDocument();
  });

  test('renders health status when present', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      stats: {
        ...transformListRow.stats,
        health: { status: 'green' },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('health')).toBeInTheDocument();
    expect(screen.getByTestId('transformListHealth')).toBeInTheDocument();
  });

  test('renders alert rules and calls onAlertEdit', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const rule = {
      name: 'Transform health rule',
      executionStatus: { status: 'active' },
    } as unknown as TransformHealthAlertRule;

    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = {
      ...transformListRow,
      alerting_rules: [rule],
    };

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('Alert rules')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Transform health rule'));
    expect(onAlertEdit).toHaveBeenCalledTimes(1);
    expect(onAlertEdit).toHaveBeenCalledWith(rule);
  });

  test('includes num_failure_retries when configured', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        settings: { num_failure_retries: 7 },
      },
    };

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('num_failure_retries')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
