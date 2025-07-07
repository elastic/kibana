/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { FileAvatar } from './file_avatar';

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

const mockFile: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType' | 'extension'> = {
  id: 'test-file-id',
  name: 'test-file.png',
  mimeType: 'image/png',
  extension: 'png',
};

const mockNonImageFile: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType' | 'extension'> = {
  id: 'test-doc-id',
  name: 'test-document.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
};

describe('FileAvatar', () => {
  it('renders an avatar for image files', () => {
    render(<FileAvatar file={mockFile} />);

    const avatar = screen.getByTestId('cases-files-avatar');
    expect(avatar).toBeInTheDocument();
    // For image files, the avatar should have a clickable cursor style
    expect(avatar).toHaveStyle('cursor: pointer');
  });

  it('renders an avatar for non-image files', () => {
    render(<FileAvatar file={mockNonImageFile} />);

    const avatar = screen.getByTestId('cases-files-avatar');
    expect(avatar).toBeInTheDocument();
    // For non-image files, it should not have pointer cursor
    expect(avatar).not.toHaveStyle('cursor: pointer');
  });

  it('shows file preview when image avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<FileAvatar file={mockFile} />);

    const avatar = screen.getByTestId('cases-files-avatar');
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();

    await user.click(avatar);

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('does not show preview when non-image avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<FileAvatar file={mockNonImageFile} />);

    const avatar = screen.getByTestId('cases-files-avatar');
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();

    await user.click(avatar);

    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });
});
