/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { basicCase } from '../../../containers/mock';
import { CaseViewObservables } from './case_view_observables';
import { renderWithTestingProviders } from '../../../common/mock';

describe('Case View Page observables tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
