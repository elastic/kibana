/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { useCreateAttachments } from '../../containers/use_create_attachments';
import userEvent from '@testing-library/user-event';
import { FilesUtilityBar } from './files_utility_bar';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/use_create_attachments');
jest.mock('../../common/lib/kibana');

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

useCreateAttachmentsMock.mockReturnValue({
  isLoading: false,
  mutateAsync: jest.fn(),
});

const defaultProps = {
  caseId: 'foobar',
  onSearch: jest.fn(),
};

describe('FilesUtilityBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<FilesUtilityBar {...defaultProps} />);

    expect(await screen.findByTestId('cases-files-search')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('search text passed correctly to callback', async () => {
    renderWithTestingProviders(<FilesUtilityBar {...defaultProps} />);

    await userEvent.type(await screen.findByTestId('cases-files-search'), 'My search{enter}');
    expect(defaultProps.onSearch).toBeCalledWith('My search');
  });
});
