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
import type { ExternalReferenceAttachmentViewProps } from '../../client/attachment_framework/types';

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

const attachmentProps = {
  externalReferenceId: basicFileMock.id,
  externalReferenceMetadata: { files: [basicFileMock] },
} as unknown as ExternalReferenceAttachmentViewProps;

describe('FileThumbnail', () => {
  it('renders the image', async () => {
    render(<FileThumbnail {...attachmentProps} />);

    expect(await screen.findByTestId('cases-files-image-thumbnail')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });

  it('shows FilePreview after clicking the image', async () => {
    const user = userEvent.setup();

    render(<FileThumbnail {...attachmentProps} />);

    const image = await screen.findByTestId('cases-files-image-thumbnail');
    await user.click(image);

    await screen.findByTestId('cases-files-image-preview');
  });
});
