/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DownloadableFile } from './types';

import { basicFileMock } from '../../../containers/mock';
import { FileAttachmentEvent } from './file_attachment_event';
import { renderWithTestingProviders } from '../../../common/mock';

describe('FileAttachmentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clickable name', async () => {
    renderWithTestingProviders(
      <FileAttachmentEvent file={basicFileMock as unknown as DownloadableFile} />
    );

    const nameLink = await screen.findByTestId('cases-files-name-link');

    expect(nameLink).toBeInTheDocument();

    await userEvent.click(nameLink);

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });
});
