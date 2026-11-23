/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { MAX_CASES_TO_MERGE } from '../../../common/constants';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { basicCase } from '../../containers/mock';
import type { CaseUI } from '../../containers/types';
import { useGetCases } from '../../containers/use_get_cases';
import { renderWithTestingProviders } from '../../common/mock';
import { MergeAddCases } from './merge_add_cases';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import { toMergeCaseSummary } from './use_merge_flyout_state';

jest.mock('../../containers/use_get_cases');

const useGetCasesMock = useGetCases as jest.Mock;

const makeCase = (id: string, incrementalId: number, title: string): CaseUI => ({
  ...basicCase,
  id,
  incrementalId,
  title,
  status: CaseStatuses.open,
  severity: CaseSeverity.HIGH,
  totalAlerts: 6,
});

const recentCases = [
  makeCase('case-1', 118, 'Phishing'),
  makeCase('case-2', 119, 'Follow-up'),
  makeCase('case-3', 120, 'Brute force'),
];

describe('MergeAddCases', () => {
  const onAddCase = jest.fn();
  const onRemoveCase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCasesMock.mockReturnValue({
      data: { cases: recentCases, total: recentCases.length },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  const renderAddCases = (selectedCases: MergeCaseSummary[]) =>
    renderWithTestingProviders(
      <MergeAddCases
        selectedCases={selectedCases}
        owner="securitySolution"
        onAddCase={onAddCase}
        onRemoveCase={onRemoveCase}
        isDisabled={false}
      />
    );

  const open = async () => {
    await userEvent.click(screen.getByTestId('merge-cases-add-cases-button'));
    await waitForEuiPopoverOpen();
  };

  const option = (id: string) => screen.getByTestId(`merge-add-cases-option-${id}`);
  const lastFilterOptions = () => useGetCasesMock.mock.lastCall[0].filterOptions;

  it("lists the solution's cases, most recently updated first", async () => {
    renderAddCases([]);
    await open();

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: { owner: ['securitySolution'], search: '', closedByMerge: 'exclude' },
      queryParams: { perPage: 50, sortField: 'updatedAt', sortOrder: 'desc' },
    });
    expect(within(option('case-2')).getByText('#119')).toBeInTheDocument();
    expect(within(option('case-2')).getByText('Follow-up')).toBeInTheDocument();
    expect(within(option('case-2')).getByText('Open')).toBeInTheDocument();
    expect(within(option('case-2')).getByText('High')).toBeInTheDocument();
    expect(within(option('case-2')).getByText(/^Updated /)).toBeInTheDocument();
    expect(within(option('case-2')).queryByText(/alerts/)).not.toBeInTheDocument();
  });

  it("ticks the merge's cases and keeps them enabled", async () => {
    renderAddCases([toMergeCaseSummary(recentCases[0])]);
    await open();

    expect(option('case-1')).toHaveAttribute('aria-checked', 'true');
    expect(option('case-1')).not.toHaveAttribute('aria-disabled', 'true');
    expect(option('case-2')).toHaveAttribute('aria-checked', 'false');
  });

  it('adds a case as soon as it is ticked and removes one as soon as it is unticked', async () => {
    renderAddCases([toMergeCaseSummary(recentCases[0])]);
    await open();

    await userEvent.click(option('case-2'));
    expect(onAddCase).toHaveBeenCalledWith(expect.objectContaining({ id: 'case-2' }));

    await userEvent.click(option('case-1'));
    expect(onRemoveCase).toHaveBeenCalledWith('case-1');

    expect(screen.getByTestId('merge-add-cases-list')).toBeInTheDocument();
  });

  it('searches the server once the typing stops', async () => {
    renderAddCases([]);
    await open();

    await userEvent.type(screen.getByTestId('merge-add-cases-search'), '#119');

    await waitFor(() => expect(lastFilterOptions().search).toBe('#119'));
  });

  it("adds no more cases once the merge is full, but still removes the merge's cases", async () => {
    const selected = [
      toMergeCaseSummary(recentCases[0]),
      ...Array.from({ length: MAX_CASES_TO_MERGE - 1 }, (_, index) =>
        toMergeCaseSummary(makeCase(`selected-${index}`, 200 + index, `Selected ${index}`))
      ),
    ];
    renderAddCases(selected);
    await open();

    expect(screen.getByTestId('merge-add-cases-limit')).toHaveTextContent(
      `You can merge up to ${MAX_CASES_TO_MERGE} cases at once.`
    );
    expect(option('case-2')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(option('case-2'));
    expect(onAddCase).not.toHaveBeenCalled();

    await userEvent.click(option('case-1'));
    expect(onRemoveCase).toHaveBeenCalledWith('case-1');
  });
});
