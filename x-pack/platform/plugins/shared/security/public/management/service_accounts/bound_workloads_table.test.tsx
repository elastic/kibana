/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { screen, within } from '@testing-library/react';
import React from 'react';

import type { ServiceAccountBoundWorkload } from '@kbn/core-security-common';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { BoundWorkloadsTable } from './bound_workloads_table';

const workload = (workloadId: string): ServiceAccountBoundWorkload => ({
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId,
  displayName: `Workflow ${workloadId}`,
});

const renderTable = (workloads: ServiceAccountBoundWorkload[]) =>
  renderWithI18n(
    <EuiProvider>
      <BoundWorkloadsTable workloads={workloads} />
    </EuiProvider>
  );

describe('BoundWorkloadsTable', () => {
  it('lists the workloads with a summary of the page', () => {
    renderTable([workload('w-1'), workload('w-2')]);

    expect(screen.getByTestId('serviceAccountBoundWorkloadsSummary')).toHaveTextContent(
      'Showing 1-2'
    );
    const table = screen.getByTestId('serviceAccountBoundWorkloadsTable');
    expect(within(table).getByText('Workflow w-1')).toBeVisible();
    expect(within(table).getByText('Workflow w-2')).toBeVisible();
    expect(screen.queryByTestId('serviceAccountBoundWorkloadsPagination')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountBoundWorkloadsEmpty')).not.toBeInTheDocument();
  });

  it('says so when no workloads are bound, rather than showing an empty page', () => {
    renderTable([]);

    expect(screen.getByTestId('serviceAccountBoundWorkloadsEmpty')).toHaveTextContent(
      'No workloads are bound to this account.'
    );
    expect(screen.queryByTestId('serviceAccountBoundWorkloadsSummary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountBoundWorkloadsTable')).not.toBeInTheDocument();
  });
});
