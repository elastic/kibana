/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlyoutTemplateManagedProvider } from '@kbn/flyout-template';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { basicCase, mockObservables } from '../../../../../containers/mock';
import { useFindCasesByObservable } from '../../../../../containers/use_find_cases_by_observable';
import { useCaseViewNavigation } from '../../../../../common/navigation/hooks';
import { ObservableCasesTable } from './observable_cases_table';

jest.mock('../../../../../containers/use_find_cases_by_observable');
jest.mock('../../../../../common/navigation/hooks', () => ({
  ...jest.requireActual('../../../../../common/navigation/hooks'),
  useCaseViewNavigation: jest.fn(),
}));

const useFindCasesByObservableMock = jest.mocked(useFindCasesByObservable);

const observable = mockObservables[0];
const caseData = { id: 'case-1', owner: 'securitySolution' };
const otherCase = { ...basicCase, id: 'case-2', title: 'Phishing campaign' };

const mockPage = (cases = [otherCase], total = cases.length, totalRelation: 'eq' | 'gte' = 'eq') =>
  useFindCasesByObservableMock.mockReturnValue({
    data: { cases, page: 1, perPage: 10, total, totalRelation },
    isFetching: false,
    isError: false,
  } as unknown as ReturnType<typeof useFindCasesByObservable>);

const lastParams = () => useFindCasesByObservableMock.mock.calls.at(-1)?.[0];

const renderTable = (close = jest.fn()) =>
  renderWithTestingProviders(
    <FlyoutTemplateManagedProvider value={{ props: { session: 'never' }, close }}>
      <ObservableCasesTable observable={observable} caseData={caseData} />
    </FlyoutTemplateManagedProvider>
  );

describe('ObservableCasesTable', () => {
  const navigateToCaseView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useCaseViewNavigation).mockReturnValue({
      getCaseViewUrl: ({ detailName }) => `/app/security/cases/${detailName}`,
      navigateToCaseView,
    });
    mockPage();
  });

  it('asks for the first page of the other cases, newest first', () => {
    renderTable();

    expect(lastParams()).toEqual({
      owner: 'securitySolution',
      typeKey: observable.typeKey,
      value: observable.value,
      excludeCaseId: 'case-1',
      page: 1,
      perPage: 10,
      sortField: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('lists the cases with their status and severity', () => {
    renderTable();

    const table = screen.getByTestId('cases-observable-cases-table');
    expect(within(table).getByText('Phishing campaign')).toBeInTheDocument();
    expect(within(table).getByText('Open')).toBeInTheDocument();
    expect(within(table).getByText('Low')).toBeInTheDocument();
  });

  it('opens a case in a new tab and keeps the flyouts open', async () => {
    const close = jest.fn();
    renderTable(close);

    const link = screen.getByTestId('case-details-link');
    expect(link).toHaveAttribute('href', '/app/security/cases/case-2');
    expect(link).toHaveAttribute('target', '_blank');

    await userEvent.click(link);

    expect(navigateToCaseView).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('moves to the next page', async () => {
    mockPage(
      Array.from({ length: 10 }, (_, index) => ({ ...otherCase, id: `case-${index + 2}` })),
      25
    );
    renderTable();

    await userEvent.click(screen.getByTestId('pagination-button-next'));

    expect(lastParams()).toEqual(expect.objectContaining({ page: 2, perPage: 10 }));
  });

  it('sorts on the server and starts again from the first page', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /Name/ }));

    expect(lastParams()).toEqual(
      expect.objectContaining({ page: 1, sortField: 'title', sortOrder: 'asc' })
    );
  });

  it('says when no other case holds the observable', () => {
    mockPage([], 0);
    renderTable();

    expect(screen.getByText('No other cases have this observable.')).toBeInTheDocument();
  });

  it('says when the list keeps only some of the cases holding the observable', () => {
    mockPage([otherCase], 10_000, 'gte');
    renderTable();

    expect(screen.getByTestId('cases-observable-cases-capped')).toHaveTextContent(
      'Showing 10,000 cases, not all of them'
    );
  });

  it('shows no limit message when every case is listed', () => {
    renderTable();

    expect(screen.queryByTestId('cases-observable-cases-capped')).not.toBeInTheDocument();
  });

  it('says when the cases could not be loaded', () => {
    useFindCasesByObservableMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
    } as unknown as ReturnType<typeof useFindCasesByObservable>);
    renderTable();

    expect(
      screen.getByText('The cases with this observable could not be loaded.')
    ).toBeInTheDocument();
  });
});
