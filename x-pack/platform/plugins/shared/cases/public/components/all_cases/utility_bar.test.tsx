/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';

import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import {
  createTestQueryClient,
  noCasesPermissions,
  onlyDeleteCasesPermission,
  renderWithTestingProviders,
  writeCasesPermissions,
} from '../../common/mock';
import { casesQueriesKeys } from '../../containers/constants';
import { basicCase } from '../../containers/mock';
import { CasesTableUtilityBar } from './utility_bar';

describe('Severity form field', () => {
  let user: UserEvent;

  const deselectCases = jest.fn();
  const localStorageKey = 'securitySolution.cases.utilityBar.hideMaxLimitWarning';

  const props = {
    totalCases: 5,
    selectedCases: [basicCase],
    deselectCases,
    pagination: {
      pageIndex: 1,
      pageSize: 10,
      totalItemCount: 5,
    },
    selectedColumns: [],
    onSelectedColumnsChange: jest.fn(),
    onClearFilters: jest.fn(),
    showClearFiltersButton: false,
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    sessionStorage.removeItem(localStorageKey);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
  });

  it('renders', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />);

    expect(await screen.findByText('Showing 5 of 5 cases')).toBeInTheDocument();
    expect(await screen.findByText('Selected 1 case')).toBeInTheDocument();
    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
    expect(await screen.findByTestId('all-cases-refresh-link-icon')).toBeInTheDocument();

    expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('all-cases-clear-filters-link-icon')).not.toBeInTheDocument();
  });

  it('renders showing cases correctly', async () => {
    const updatedProps = {
      ...props,
      totalCases: 20,
      pagination: {
        ...props.pagination,
        totalItemCount: 20,
      },
    };

    <CasesTableUtilityBar {...updatedProps} />;

    expect(await screen.findByText('Showing 10 of 20 cases')).toBeInTheDocument();
    expect(await screen.findByText('Selected 1 case')).toBeInTheDocument();
  });

  it('renders showing cases correctly for second page', async () => {
    const updatedProps = {
      ...props,
      totalCases: 20,
      pagination: {
        ...props.pagination,
        pageIndex: 2,
        totalItemCount: 20,
      },
    };

    <CasesTableUtilityBar {...updatedProps} />;

    expect(await screen.findByText('Showing 10 of 20 cases')).toBeInTheDocument();
    expect(await screen.findByText('Selected 1 case')).toBeInTheDocument();
  });

  it('renders showing cases correctly when no cases available', async () => {
    const updatedProps = {
      ...props,
      totalCases: 0,
      selectedCases: [],
      deselectCases,
      pagination: {
        pageSize: 10,
        pageIndex: 1,
        totalItemCount: 0,
      },
    };

    <CasesTableUtilityBar {...updatedProps} />;
    expect(await screen.findByText('Showing 0 of 0 cases')).toBeInTheDocument();
  });

  it('renders columns popover button when isSelectorView=False', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />);
    expect(await screen.findByTestId('column-selection-popover-button')).toBeInTheDocument();
  });

  it('does not render columns popover button when isSelectorView=True', async () => {
    <CasesTableUtilityBar {...props} isSelectorView={true} />;
    expect(screen.queryByTestId('column-selection-popover-button')).not.toBeInTheDocument();
  });

  it('opens the bulk actions correctly', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />);

    await user.click(await screen.findByTestId('case-table-bulk-actions-link-icon'));

    expect(await screen.findByTestId('case-table-bulk-actions-context-menu'));
  });

  it('closes the bulk actions correctly', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />);

    await user.click(await screen.findByTestId('case-table-bulk-actions-link-icon'));

    expect(await screen.findByTestId('case-table-bulk-actions-context-menu'));

    await user.click(await screen.findByTestId('case-table-bulk-actions-link-icon'));

    await waitForElementToBeRemoved(screen.queryByTestId('case-table-bulk-actions-context-menu'));
  });

  it('refresh correctly', async () => {
    const queryClient = createTestQueryClient();
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: { queryClient },
    });

    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await user.click(await screen.findByTestId('all-cases-refresh-link-icon'));

    await waitFor(() => {
      expect(deselectCases).toHaveBeenCalled();
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('does not show the bulk actions without update & delete permissions', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('case-table-bulk-actions-link-icon')).not.toBeInTheDocument();
  });

  it('does show the bulk actions with only delete permissions', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: { permissions: onlyDeleteCasesPermission() },
    });

    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does show the bulk actions with update permissions', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: { permissions: writeCasesPermissions() },
    });

    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does not show the bulk actions if there are not selected cases', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} selectedCases={[]} />);

    expect(screen.queryByTestId('case-table-bulk-actions-link-icon')).not.toBeInTheDocument();
    expect(screen.queryByText('Showing 0 cases')).not.toBeInTheDocument();
  });

  it('shows the clear filter button', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} showClearFiltersButton={true} />);

    expect(await screen.findByTestId('all-cases-clear-filters-link-icon')).toBeInTheDocument();
  });

  it('clears the filters correctly', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} showClearFiltersButton={true} />);

    await user.click(await screen.findByTestId('all-cases-clear-filters-link-icon'));

    await waitFor(() => {
      expect(props.onClearFilters).toHaveBeenCalled();
    });
  });

  it('does show the bulk actions with only assign permissions', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: {
        permissions: {
          ...noCasesPermissions(),
          assign: true,
        },
      },
    });

    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('shows bulk actions when only assignCase and update permissions are present', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: {
        permissions: {
          ...noCasesPermissions(),
          assign: true,
          update: true,
        },
      },
    });

    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('shows bulk actions when only assignCase and delete permissions are present', async () => {
    renderWithTestingProviders(<CasesTableUtilityBar {...props} />, {
      wrapperProps: {
        permissions: {
          ...noCasesPermissions(),
          assign: true,
          delete: true,
        },
      },
    });

    expect(await screen.findByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  describe('Maximum number of cases', () => {
    const newProps = {
      ...props,
      selectedCaseS: [],
      totalCases: MAX_DOCS_PER_PAGE,
      pagination: {
        ...props.pagination,
        totalItemCount: MAX_DOCS_PER_PAGE,
      },
    };

    const allCasesPageSize = [10, 25, 50, 100];

    it.each(allCasesPageSize)(
      `does not show warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 < ${MAX_DOCS_PER_PAGE}`,
      async (size) => {
        const newPageIndex = MAX_DOCS_PER_PAGE / size - 2;

        renderWithTestingProviders(
          <CasesTableUtilityBar
            {...{
              ...newProps,
              pagination: { ...newProps.pagination, pageSize: size, pageIndex: newPageIndex },
            }}
          />
        );

        expect(
          await screen.findByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)
        ).toBeInTheDocument();

        expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
      }
    );

    it.each(allCasesPageSize)(
      `shows warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 = ${MAX_DOCS_PER_PAGE}`,
      async (size) => {
        const newPageIndex = MAX_DOCS_PER_PAGE / size - 1;

        renderWithTestingProviders(
          <CasesTableUtilityBar
            {...{
              ...newProps,
              pagination: { ...newProps.pagination, pageSize: size, pageIndex: newPageIndex },
            }}
          />
        );

        expect(
          await screen.findByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)
        ).toBeInTheDocument();

        expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      }
    );

    it.each(allCasesPageSize)(
      `shows warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 > ${MAX_DOCS_PER_PAGE}`,
      async (size) => {
        const newPageIndex = MAX_DOCS_PER_PAGE / size;

        renderWithTestingProviders(
          <CasesTableUtilityBar
            {...{
              ...newProps,
              pagination: { ...newProps.pagination, pageSize: size, pageIndex: newPageIndex },
            }}
          />
        );

        expect(
          await screen.findByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)
        ).toBeInTheDocument();

        expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      }
    );

    it('should show dismiss and do not show again buttons correctly', async () => {
      renderWithTestingProviders(
        <CasesTableUtilityBar
          {...{
            ...newProps,
            pagination: { ...newProps.pagination, pageSize: 100, pageIndex: 100 },
          }}
        />
      );

      expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      expect(await screen.findByTestId('dismiss-warning')).toBeInTheDocument();
      expect(await screen.findByTestId('do-not-show-warning')).toBeInTheDocument();
    });

    it('should dismiss warning correctly', async () => {
      renderWithTestingProviders(
        <CasesTableUtilityBar
          {...{
            ...newProps,
            pagination: { ...newProps.pagination, pageSize: 100, pageIndex: 100 },
          }}
        />
      );

      expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      expect(await screen.findByTestId('dismiss-warning')).toBeInTheDocument();

      await user.click(await screen.findByTestId('dismiss-warning'));

      expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
    });

    describe('do not show button', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
        sessionStorage.removeItem(localStorageKey);
      });

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should set storage key correctly', async () => {
        renderWithTestingProviders(
          <CasesTableUtilityBar
            {...{
              ...newProps,
              pagination: { ...newProps.pagination, pageSize: 100, pageIndex: 100 },
            }}
          />
        );

        expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
        expect(await screen.findByTestId('do-not-show-warning')).toBeInTheDocument();

        expect(localStorage.getItem(localStorageKey)).toBe('false');
      });

      it('should hide warning correctly when do not show button clicked', async () => {
        renderWithTestingProviders(
          <CasesTableUtilityBar
            {...{
              ...newProps,
              pagination: { ...newProps.pagination, pageSize: 100, pageIndex: 100 },
            }}
          />
        );

        expect(await screen.findByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
        expect(await screen.findByTestId('do-not-show-warning')).toBeInTheDocument();

        await user.click(await screen.findByTestId('do-not-show-warning'));

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
        expect(localStorage.getItem(localStorageKey)).toBe('true');
      });
    });
  });
});
