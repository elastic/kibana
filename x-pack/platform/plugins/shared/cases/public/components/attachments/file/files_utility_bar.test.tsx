/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { screen } from '@testing-library/react';

import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { FilesUtilityBar } from './files_utility_bar';
import { renderWithTestingProviders } from '../../../common/mock';

vi.mock('../../../containers/api');
vi.mock('../../../containers/use_create_attachments');
vi.mock('../../../common/lib/kibana');

const useCreateAttachmentsMock = useCreateAttachments as Mock;

useCreateAttachmentsMock.mockReturnValue({
  isLoading: false,
  mutateAsync: vi.fn(),
});

const defaultProps = {
  caseId: 'foobar',
};

describe('FilesUtilityBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<FilesUtilityBar {...defaultProps} />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });
});
