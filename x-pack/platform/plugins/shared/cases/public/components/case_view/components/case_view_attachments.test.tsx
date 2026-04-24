/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';
import { renderWithTestingProviders } from '../../../common/mock';
import { CaseViewAttachments } from './case_view_attachments';
import { screen, waitFor } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { useGetCaseFileStats } from '../../../containers/use_get_case_file_stats';
import userEvent from '@testing-library/user-event';

jest.mock('../../../containers/use_get_case_file_stats');
jest.mock('../../../common/navigation/hooks');
jest.mock('../use_case_observables', () => ({
  useCaseObservables: jest.fn(() => ({ observables: [], isLoading: false })),
}));

const useGetCaseFileStatsMock = useGetCaseFileStats as jest.Mock;

const caseData: CaseUI = basicCase;

const basicLicense = licensingMock.createLicense({
  license: { type: 'basic' },
});

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

const fileStatsData = { total: 3 };
const onSearchMock = jest.fn();
const onUpdateFieldMock = jest.fn();

describe('Case View Attachments tab', () => {
  beforeEach(() => {
    useGetCaseFileStatsMock.mockReturnValue({ data: fileStatsData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tabs and the search field', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        onSearch={onSearchMock}
        onUpdateField={onUpdateFieldMock}
      />
    );

    expect(screen.getByTestId('case-view-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('cases-files-search')).toBeInTheDocument();
  });

  it('calls the onSearch callback when the search field is changed', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        onSearch={onSearchMock}
        onUpdateField={onUpdateFieldMock}
      />
    );

    await userEvent.type(screen.getByTestId('cases-files-search'), 'search{Enter}');

    await waitFor(() => {
      expect(onSearchMock).toHaveBeenCalledWith('search');
    });
  });

  it('does not render an observables accordion when license is basic', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        onSearch={onSearchMock}
        onUpdateField={onUpdateFieldMock}
      />,
      { wrapperProps: { license: basicLicense } }
    );

    expect(
      screen.queryByTestId('case-view-attachment-accordion-observables')
    ).not.toBeInTheDocument();
  });

  it('renders an observables accordion when the license is platinum', async () => {
    renderWithTestingProviders(
      <CaseViewAttachments
        caseData={caseData}
        onSearch={onSearchMock}
        onUpdateField={onUpdateFieldMock}
      />,
      { wrapperProps: { license: platinumLicense } }
    );

    expect(
      await screen.findByTestId('case-view-attachment-accordion-observables')
    ).toBeInTheDocument();
  });
});
