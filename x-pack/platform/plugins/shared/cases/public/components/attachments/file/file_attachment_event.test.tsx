/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import type { DownloadableFile } from './types';

import { basicFileMock } from '../../../containers/mock';
import { FileAttachmentEvent } from './file_attachment_event';
import { renderWithTestingProviders } from '../../../common/mock';

describe('FileAttachmentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clickable name', () => {
    renderWithTestingProviders(
      <FileAttachmentEvent file={basicFileMock as unknown as DownloadableFile} />
    );

    const nameLink = screen.getByTestId('cases-files-name-link');

    expect(nameLink).toBeInTheDocument();

    fireEvent.click(nameLink);

    expect(screen.getByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('renders the name as plain text when the file attachment is deleted', () => {
    renderWithTestingProviders(
      <FileAttachmentEvent file={basicFileMock as unknown as DownloadableFile} isDeleted />
    );

    expect(screen.getByTestId('cases-files-name-text')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-name-link')).not.toBeInTheDocument();
  });
});
