/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileThumbnail } from './file_thumbnail';
import { basicFileMock } from '../../containers/mock';

jest.mock('@kbn/shared-ux-file-context', () => ({
  useFilesContext: () => ({
    client: {
      getDownloadHref: jest.fn(() => 'http://example.com/file'),
    },
  }),
}));

jest.mock('../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({
    owner: ['securitySolution'],
  }),
}));

describe('FileThumbnail', () => {
  it('renders an EuiImage when compact is not provided', async () => {
    render(<FileThumbnail file={basicFileMock} />);

    expect(await screen.findByTestId('cases-files-image-thumbnail')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-thumbnail-compact')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });

  it('renders an EuiAvatar and not an EuiImage when compact is true', async () => {
    render(<FileThumbnail file={basicFileMock} compact />);

    expect(await screen.findByTestId('cases-files-image-thumbnail-compact')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-thumbnail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });

  it('shows FilePreview after clicking the image', async () => {
    const user = userEvent.setup();

    render(<FileThumbnail file={basicFileMock} />);

    const image = await screen.findByTestId('cases-files-image-thumbnail');
    await user.click(image);

    await screen.findByTestId('cases-files-image-preview');
  });

  it('shows FilePreview after clicking the avatar thumbnail', async () => {
    const user = userEvent.setup();

    render(<FileThumbnail file={basicFileMock} compact />);

    const avatar = await screen.findByTestId('cases-files-image-thumbnail-compact');
    await user.click(avatar);

    await screen.findByTestId('cases-files-image-preview');
  });
});
