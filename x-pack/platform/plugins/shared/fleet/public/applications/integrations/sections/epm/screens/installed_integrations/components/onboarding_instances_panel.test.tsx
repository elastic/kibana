/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import { useGetCloudOnboardingDeploymentsQuery } from '../../../../../../../hooks';

import { OnboardingInstancesPanel } from './onboarding_instances_panel';

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  useGetCloudOnboardingDeploymentsQuery: jest.fn(),
}));
jest.mock('../hooks/use_url_filters', () => ({
  useViewOnboardingInstances: jest.fn(() => ({ addViewOnboardingInstances: jest.fn() })),
}));
jest.mock('./onboarding_instances_table', () => ({
  OnboardingInstancesTable: ({
    onboardingInstances,
    packageName,
    isLoading,
    error,
    pagination,
    onPageChange,
  }: {
    onboardingInstances: Array<{ id: string }>;
    packageName: string;
    isLoading: boolean;
    error?: string;
    pagination: { pageIndex: number; pageSize: number; totalItemCount: number };
    onPageChange: (pageIndex: number) => void;
  }) => (
    <div data-test-subj="instancesTable">
      {packageName} {onboardingInstances.map((i) => i.id).join(',')} page {pagination.pageIndex} of{' '}
      {pagination.totalItemCount} by {pagination.pageSize}
      {isLoading ? ' loading' : ''}
      {error ? ` error: ${error}` : ''}
      <button data-test-subj="nextPage" onClick={() => onPageChange(pagination.pageIndex + 1)} />
    </div>
  ),
}));

const mockQuery = useGetCloudOnboardingDeploymentsQuery as jest.Mock;

const installedPackage = { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.0.0' };

describe('OnboardingInstancesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReturnValue({
      data: { items: [{ id: 'd1' }, { id: 'd2' }], total: 25, page: 1, perPage: 20 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  const render = () =>
    createIntegrationsTestRendererMock().render(
      <OnboardingInstancesPanel installedPackage={installedPackage} />
    );

  it('loads the first page of the instances of its package', () => {
    render();

    expect(mockQuery).toHaveBeenCalledWith({
      provider: 'aws',
      packageName: 'aws_bedrock',
      page: 1,
      perPage: 20,
    });
    expect(screen.getByTestId('instancesTable')).toHaveTextContent(
      'aws_bedrock d1,d2 page 0 of 25 by 20'
    );
  });

  it('loads the next page when the table changes page', async () => {
    render();

    await act(async () => {
      screen.getByTestId('nextPage').click();
    });

    expect(mockQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, perPage: 20 }));
  });

  it('goes back a page when its page became empty, e.g. after a delete', async () => {
    render();
    // Page 2 comes back empty, as when its last instance was deleted.
    mockQuery.mockReturnValue({
      data: { items: [], total: 20, page: 2, perPage: 20 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    await act(async () => {
      screen.getByTestId('nextPage').click();
    });

    expect(mockQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('goes back only to the new last page, not further', async () => {
    mockQuery.mockReturnValue({
      data: { items: [{ id: 'd1' }], total: 60, page: 1, perPage: 20 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    render();
    await act(async () => {
      screen.getByTestId('nextPage').click();
    });
    await act(async () => {
      screen.getByTestId('nextPage').click();
    });
    // Page 3 comes back empty after its last instance was deleted; 2 pages are left.
    mockQuery.mockReturnValue({
      data: { items: [], total: 40, page: 3, perPage: 20 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    await act(async () => {
      screen.getByTestId('nextPage').click();
    });

    expect(mockQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('does not change page on placeholder data from the previous page', async () => {
    render();
    mockQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 20 },
      isLoading: false,
      isFetching: true,
      isError: false,
      isPreviousData: true,
    });

    await act(async () => {
      screen.getByTestId('nextPage').click();
    });

    expect(mockQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('shows the loading state while a page loads', () => {
    mockQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
    });
    render();

    expect(screen.getByTestId('instancesTable')).toHaveTextContent('loading');
  });

  it('shows an error when the instances cannot be loaded', () => {
    mockQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    });
    render();

    expect(screen.getByTestId('instancesTable')).toHaveTextContent(
      'error: Could not load the instances of this integration.'
    );
  });
});
