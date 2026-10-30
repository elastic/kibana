/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesContext } from '../cases_context/use_cases_context';
import { SolutionProfileScope } from './solution_profile_scope';

jest.mock('../app/use_available_owners');
jest.mock('../../containers/use_get_available_owners', () => ({
  useGetAvailableOwners: () => ({ isLoading: false }),
}));

const useAvailableCasesOwnersMock = useAvailableCasesOwners as jest.Mock;

const OwnerProbe = () => {
  const { owner } = useCasesContext();
  return <span data-test-subj="owner">{owner.join(',')}</span>;
};

const renderScope = (owner: string[], path = '/configure') =>
  render(
    <TestProviders owner={owner}>
      <MemoryRouter initialEntries={[path]}>
        <SolutionProfileScope>
          <OwnerProbe />
        </SolutionProfileScope>
      </MemoryRouter>
    </TestProviders>
  );

describe('SolutionProfileScope', () => {
  beforeEach(() => {
    useAvailableCasesOwnersMock.mockReturnValue(['observability', 'securitySolution']);
  });

  it("leaves a solution's own settings page alone", () => {
    renderScope(['securitySolution']);

    expect(screen.getByTestId('owner')).toHaveTextContent('securitySolution');
    expect(screen.queryByTestId('cases-settings-solution-select')).not.toBeInTheDocument();
  });

  it('scopes the top-level settings page to the first available solution', () => {
    renderScope([]);

    expect(screen.getByTestId('owner')).toHaveTextContent('observability');
    expect(screen.getByTestId('cases-settings-solution-select')).toBeInTheDocument();
  });

  it('scopes the page to the solution in the URL', () => {
    renderScope([], '/configure?solution=securitySolution');

    expect(screen.getByTestId('owner')).toHaveTextContent('securitySolution');
  });

  it('hides the picker when only one solution exists', () => {
    useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
    renderScope([]);

    expect(screen.queryByTestId('cases-settings-solution-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('owner')).toHaveTextContent('securitySolution');
  });

  it('says so when the user has no solution settings', () => {
    useAvailableCasesOwnersMock.mockReturnValue([]);
    renderScope([]);

    expect(
      screen.getByText("You don't have access to the settings of any solution.")
    ).toBeInTheDocument();
  });
});
