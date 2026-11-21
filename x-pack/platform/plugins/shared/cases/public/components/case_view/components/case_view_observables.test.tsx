/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicCase } from '../../../containers/mock';
import { CaseViewObservables } from './case_view_observables';
import { renderWithTestingProviders } from '../../../common/mock';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useFindObservables } from '../../../containers/use_find_observables';

jest.mock('../../../common/use_cases_features');
jest.mock('../../../containers/use_find_observables');

const useFindObservablesMock = useFindObservables as jest.Mock;

describe('Case View Page observables tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesFeatures as jest.Mock).mockReturnValue({
      isExtractObservablesEnabled: true,
      observablesAuthorized: true,
    });
    useFindObservablesMock.mockReturnValue({
      data: { observables: basicCase.observables, total: basicCase.observables.length },
      isFetching: false,
      isLoading: false,
    });
  });

  it('should render the utility bar for the observables table', async () => {
    renderWithTestingProviders(
      <CaseViewObservables caseData={basicCase} isLoading={false} onUpdateField={jest.fn()} />
    );

    expect((await screen.findAllByTestId('cases-observables-add')).length).toBe(2);
  });

  it('should render the observable table', async () => {
    renderWithTestingProviders(
      <CaseViewObservables caseData={basicCase} isLoading={false} onUpdateField={jest.fn()} />
    );

    expect(await screen.findByTestId('cases-observables-table')).toBeInTheDocument();
  });

  it('calls onUpdateField with the new (not stale) extractObservables value when toggled', async () => {
    const onUpdateField = jest.fn();
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={{ ...basicCase, settings: { ...basicCase.settings, extractObservables: false } }}
        isLoading={false}
        onUpdateField={onUpdateField}
      />
    );

    const toggle = await screen.findByTestId('extract-observables-switch');
    await userEvent.click(toggle);

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'settings',
      value: { ...basicCase.settings, extractObservables: true },
    });
  });

  it('counts every stored observable, not just the case preview', async () => {
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={{ ...basicCase, totalObservables: 47_552 }}
        isLoading={false}
        onUpdateField={jest.fn()}
      />
    );

    expect(await screen.findByText('47552')).toBeInTheDocument();
  });

  it('searches observables on the server', () => {
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={basicCase}
        isLoading={false}
        searchTerm="foobar"
        onUpdateField={jest.fn()}
      />
    );

    expect(useFindObservablesMock).toHaveBeenCalledWith(
      basicCase.id,
      expect.objectContaining({ search: 'foobar' }),
      { enabled: true }
    );
  });
});
