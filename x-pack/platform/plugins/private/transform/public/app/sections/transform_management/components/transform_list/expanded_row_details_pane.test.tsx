/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import moment from 'moment-timezone';
import React from 'react';

import type { TransformListRow } from '../../../../common';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';
import * as appDependencies from '../../../../app_dependencies';
import { ExpandedRowDetailsPane } from './expanded_row_details_pane';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { useGetTransformStats } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({
  useGetTransformStats: jest.fn(),
}));

jest.mock('../../../../app_dependencies');

const mockUseGetTransformStats = useGetTransformStats as jest.MockedFunction<
  typeof useGetTransformStats
>;

describe('Transform: Transform List Expanded Row <ExpandedRowDetailsPane />', () => {
  const onAlertEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appDependencies.useAppDependencies().cps = undefined;

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

    const item = transformListRow as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByTestId('transformDetailsTabContent')).toBeInTheDocument();

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.queryByText('State')).not.toBeInTheDocument();
    expect(screen.getByText('Checkpointing')).toBeInTheDocument();

    expect(screen.getByText('Transform version')).toBeInTheDocument();
    expect(screen.getByText('Source index')).toBeInTheDocument();
    expect(screen.getByText('farequote-2019')).toBeInTheDocument();
    expect(screen.queryByText('Project routing')).not.toBeInTheDocument();
    expect(screen.getByText('Destination index')).toBeInTheDocument();
    expect(screen.getAllByText('fq_date_histogram_1m_1441').length).toBeGreaterThan(0);

    expect(screen.getByText('Last timestamp (milliseconds)')).toBeInTheDocument();
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

    expect(screen.getByText('Source index')).toBeInTheDocument();
    expect(screen.getByText('source-index-1')).toBeInTheDocument();
  });

  test('displays project routing when configured', () => {
    appDependencies.useAppDependencies().cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        hasLinkedProjects: jest.fn(() => true),
      },
    } as any;
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
          project_routing: '_alias:*',
        },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('Project routing')).toBeInTheDocument();
    expect(screen.getByText('_alias:*')).toBeInTheDocument();
  });

  test('hides project routing when there are no linked projects', async () => {
    const fetchProjects = jest.fn().mockResolvedValue({
      origin: {
        _id: 'origin-id',
        _alias: 'local_project',
        _organisation: 'org',
        _type: 'security',
      },
      linkedProjects: [],
    });
    appDependencies.useAppDependencies().cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        hasLinkedProjects: jest.fn(() => false),
        fetchProjects,
      },
    } as any;
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
          project_routing: '_alias:*',
        },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalled();
    });
    expect(screen.queryByText('Project routing')).not.toBeInTheDocument();
    expect(screen.queryByText('_alias:*')).not.toBeInTheDocument();
  });

  test('keeps project routing visible when linked project discovery fails', async () => {
    const fetchProjects = jest.fn().mockRejectedValue(new Error('Project fetch failed'));
    appDependencies.useAppDependencies().cps = {
      isTierEligible: true,
      cpsManager: {
        whenReady: jest.fn().mockResolvedValue(undefined),
        hasLinkedProjects: jest.fn(() => false),
        fetchProjects,
      },
    } as any;
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
          project_routing: '_alias:*',
        },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalled();
    });
    expect(screen.getByText('Project routing')).toBeInTheDocument();
    expect(screen.getByText('_alias:*')).toBeInTheDocument();
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

    expect(screen.getByText('Source index')).toBeInTheDocument();
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

    const item = transformListRow as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(
      screen.getByText(
        'An error occurred fetching the extended stats for this transform. Basic stats are displayed instead.'
      )
    ).toBeInTheDocument();
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

    const item = {
      ...transformListRow,
      alerting_rules: [rule],
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('Alert rules')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Transform health rule'));
    expect(onAlertEdit).toHaveBeenCalledTimes(1);
    expect(onAlertEdit).toHaveBeenCalledWith(rule);
  });

  test('renders authorization as formatted JSON', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        authorization: { roles: ['transform-admin'] },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.getByTestId('transformAuthorization')).toHaveTextContent(
      '"roles": [ "transform-admin" ]'
    );
  });

  test('includes num_failure_retries when configured', () => {
    mockUseGetTransformStats.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformStats>);

    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        settings: { num_failure_retries: 7 },
      },
    } as unknown as TransformListRow;

    renderWithI18n(<ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />);

    expect(screen.getByText('Number of failure retries')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
