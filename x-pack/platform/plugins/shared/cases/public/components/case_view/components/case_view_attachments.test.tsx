/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';
import { renderWithTestingProviders } from '../../../common/mock';
import { CaseViewAttachments } from './case_view_attachments';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { screen } from '@testing-library/react';

jest.mock('../../../containers/api');

// Not using `jest.mocked` here because the `AlertsTable` component is manually typed to ensure
// correct type inference, but it's actually a `memo(forwardRef())` component, which is hard to mock
jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn(() => <div data-test-subj="alerts-table" />),
}));

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

describe('Case View Attachments tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the case view attachments tab', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
    );

    expect(screen.getByTestId('case-view-tabs')).toBeInTheDocument();
  });
});
