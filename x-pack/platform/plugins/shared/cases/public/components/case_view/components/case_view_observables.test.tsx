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

jest.mock('../../../common/use_cases_features');

describe('Case View Page observables tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesFeatures as jest.Mock).mockReturnValue({
      isExtractObservablesEnabled: true,
      observablesAuthorized: true,
    });
  });

  it('should render the utility bar for the observables table', async () => {
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={basicCase}
        observables={basicCase.observables}
        isLoading={false}
        onUpdateField={jest.fn()}
      />
    );

    expect((await screen.findAllByTestId('cases-observables-add')).length).toBe(2);
  });

  it('should render the observable table', async () => {
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={basicCase}
        observables={basicCase.observables}
        isLoading={false}
        onUpdateField={jest.fn()}
      />
    );

    expect(await screen.findByTestId('cases-observables-table')).toBeInTheDocument();
  });

  it('calls onUpdateField with the new (not stale) extractObservables value when toggled', async () => {
    const onUpdateField = jest.fn();
    renderWithTestingProviders(
      <CaseViewObservables
        caseData={{ ...basicCase, settings: { ...basicCase.settings, extractObservables: false } }}
        observables={basicCase.observables}
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

  it('returns null when searching and no observables match', () => {
    const { container } = renderWithTestingProviders(
      <CaseViewObservables
        caseData={basicCase}
        observables={[]}
        isLoading={false}
        searchTerm="foobar"
        onUpdateField={jest.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
