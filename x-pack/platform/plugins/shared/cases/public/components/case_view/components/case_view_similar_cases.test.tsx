/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { CaseUI } from '../../../../common';

import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import { CaseViewSimilarCases } from './case_view_similar_cases';
import { renderWithTestingProviders } from '../../../common/mock';

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

// Failing: See https://github.com/elastic/kibana/issues/207056
describe('Case View Page similar cases tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the similar cases table', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('similar-cases-table')).toBeInTheDocument();
  });
});
