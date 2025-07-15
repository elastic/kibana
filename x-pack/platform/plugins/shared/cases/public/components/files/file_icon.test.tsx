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
import { FileIcon } from './file_icon';

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

const mockFile: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType'> = {
  id: 'test-file-id',
  name: 'test-file.png',
  mimeType: 'image/png',
};

const mockNonImageFile: Pick<FileJSON<unknown>, 'id' | 'name' | 'mimeType'> = {
  id: 'test-doc-id',
  name: 'test-document.pdf',
  mimeType: 'application/pdf',
};

describe('FileIcon', () => {
  it('renders an image for image files', () => {
    render(<FileIcon file={mockFile} />);

    const image = screen.getByTestId('cases-files-icon-image');
    expect(image).toBeInTheDocument();
    // For image files, the image should have a clickable cursor style
    expect(image).toHaveStyle('cursor: pointer');
  });

  it('renders an icon for non-image files', () => {
    render(<FileIcon file={mockNonImageFile} />);

    const icon = screen.getByTestId('cases-files-icon');
    expect(icon).toBeInTheDocument();
    // For non-image files, it should not have pointer cursor
    expect(icon).not.toHaveStyle('cursor: pointer');
  });

  it('shows file preview when the image is clicked', async () => {
    const user = userEvent.setup();
    render(<FileIcon file={mockFile} />);

    const image = screen.getByTestId('cases-files-icon-image');
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();

    await user.click(image);

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('does not show preview when the non-image icon is clicked', async () => {
    const user = userEvent.setup();
    render(<FileIcon file={mockNonImageFile} />);

    const icon = screen.getByTestId('cases-files-icon');
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();

    await user.click(icon);

    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });
});
