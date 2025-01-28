/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { CaseUI } from '../../../../common';
import type { AppMockRenderer } from '../../../common/mock';

import { createAppMockRenderer } from '../../../common/mock';
import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import { CaseViewSimilarCases } from './case_view_similar_cases';

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

// Failing: See https://github.com/elastic/kibana/issues/207056
describe.skip('Case View Page similar cases tab', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('should render the similar cases table', async () => {
    appMockRender.render(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('similar-cases-table')).toBeInTheDocument();
  });
});
