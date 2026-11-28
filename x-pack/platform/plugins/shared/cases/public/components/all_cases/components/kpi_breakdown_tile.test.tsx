/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import React from 'react';

import { renderWithTestingProviders } from '../../../common/mock';
import type { KpiMetricBreakdownResult } from '../../../../common/types/api';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import {
  KpiBreakdownTile,
  formatKpiBreakdownSummary,
  getKpiBreakdownRows,
} from './kpi_breakdown_tile';

jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');

const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

const createResult = (
  overrides: Partial<KpiMetricBreakdownResult> = {}
): KpiMetricBreakdownResult => ({
  id: 'severity',
  type: 'breakdown',
  field: 'case.severity',
  total: 42,
  buckets: [
    { key: 'high', count: 10 },
    { key: 'low', count: 10 },
    { key: 'critical', count: 12 },
    { key: 'medium', count: 10 },
  ],
  otherCount: 0,
  missingCount: 0,
  ...overrides,
});

const TEST_SUBJ = 'cases-kpi-tile-severity';

const renderTile = (props: Partial<React.ComponentProps<typeof KpiBreakdownTile>> = {}) =>
  renderWithTestingProviders(
    <KpiBreakdownTile
      label="Cases by severity"
      result={createResult()}
      isLoading={false}
      dataTestSubj={TEST_SUBJ}
      {...props}
    />
  );

describe('KpiBreakdownTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map() });
  });

  it('shows the severity rows in severity order', async () => {
    renderTile();

    const tile = await screen.findByTestId(TEST_SUBJ);
    const labels = ['Critical', 'High', 'Medium', 'Low'].map((label) =>
      within(tile).getByText(label)
    );

    labels.slice(1).forEach((label, position) => {
      expect(labels[position].compareDocumentPosition(label)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(within(tile).getByText('42')).toBeInTheDocument();
  });

  it('shows the other row only when the other count is more than 0', async () => {
    const { rerender } = renderTile();

    expect(await screen.findByTestId(TEST_SUBJ)).toBeInTheDocument();
    expect(screen.queryByText('Other')).not.toBeInTheDocument();

    rerender(
      <KpiBreakdownTile
        label="Cases by severity"
        result={createResult({ otherCount: 3 })}
        isLoading={false}
        dataTestSubj={TEST_SUBJ}
      />
    );

    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows the no value row only when the missing count is more than 0', async () => {
    const { rerender } = renderTile();

    expect(await screen.findByTestId(TEST_SUBJ)).toBeInTheDocument();
    expect(screen.queryByText('No value')).not.toBeInTheDocument();

    rerender(
      <KpiBreakdownTile
        label="Cases by severity"
        result={createResult({ missingCount: 2 })}
        isLoading={false}
        dataTestSubj={TEST_SUBJ}
      />
    );

    expect(screen.getByText('No value')).toBeInTheDocument();
  });

  it('shows no data for a total of 0', async () => {
    renderTile({ result: createResult({ total: 0, buckets: [] }) });

    expect(await screen.findByTestId(`${TEST_SUBJ}-empty`)).toHaveTextContent('No data');
    expect(within(screen.getByTestId(TEST_SUBJ)).getByText('0')).toBeInTheDocument();
  });

  it('shows the loading spinner', async () => {
    renderTile({ isLoading: true });

    expect(await screen.findByTestId(`${TEST_SUBJ}-loading-spinner`)).toBeInTheDocument();
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });

  it('shows the profile name of an assignee uid and the uid of an unknown user', async () => {
    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
    const [profile] = userProfiles;

    renderTile({
      result: createResult({
        field: 'case.assignees.uid',
        buckets: [
          { key: profile.uid, count: 4 },
          { key: 'unknown-uid', count: 2 },
        ],
      }),
    });

    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('unknown-uid')).toBeInTheDocument();
    expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({
      uids: [profile.uid, 'unknown-uid'],
    });
  });

  it('shows the change of a row with a previous count and no change for 0 or null', async () => {
    renderTile({
      direction: 'lower_is_better',
      result: createResult({
        buckets: [
          { key: 'critical', count: 12, previousCount: 8 },
          { key: 'high', count: 10, previousCount: 0 },
          { key: 'medium', count: 10, previousCount: null },
        ],
      }),
    });

    const [criticalChange] = await screen.findAllByTestId(`${TEST_SUBJ}-row-value-critical-change`);

    expect(criticalChange).toHaveTextContent('+50%');
    expect(screen.queryAllByTestId(`${TEST_SUBJ}-row-value-high-change`)).toHaveLength(0);
    expect(screen.queryAllByTestId(`${TEST_SUBJ}-row-value-medium-change`)).toHaveLength(0);
  });

  it('shows an empty tile for an error', async () => {
    renderTile({ result: undefined, errorMessage: 'bad field' });

    expect(within(await screen.findByTestId(TEST_SUBJ)).getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });
});

describe('getKpiBreakdownRows', () => {
  it('keeps the server order for a field with no fixed order', () => {
    const rows = getKpiBreakdownRows(
      createResult({
        field: 'case.tags',
        buckets: [
          { key: 'b', count: 3 },
          { key: 'a', count: 3 },
        ],
      })
    );

    expect(rows.map(({ label }) => label)).toEqual(['b', 'a']);
  });

  it('shows the status rows in status order with the status labels', () => {
    const rows = getKpiBreakdownRows(
      createResult({
        field: 'case.status',
        buckets: [
          { key: 'closed', count: 27 },
          { key: 'open', count: 11 },
          { key: 'in-progress', count: 4 },
        ],
      })
    );

    expect(rows.map(({ label }) => label)).toEqual(['Open', 'In progress', 'Closed']);
  });
});

describe('formatKpiBreakdownSummary', () => {
  it('formats the rows as one line', () => {
    expect(
      formatKpiBreakdownSummary(
        getKpiBreakdownRows(
          createResult({
            buckets: [
              { key: 'critical', count: 12 },
              { key: 'high', count: 10 },
            ],
          })
        )
      )
    ).toBe('Critical 12, High 10');
  });
});
