/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';

import { FileThumbnail } from './file_thumbnail';
import { basicCase, basicFileMock } from '../../../containers/mock';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import type { FileAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/file/v2';

type FileViewProps = UnifiedReferenceAttachmentViewProps<FileAttachmentMetadata>;

jest.mock('@kbn/shared-ux-file-context', () => ({
  useFilesContext: () => ({
    client: {
      getDownloadHref: jest.fn(() => 'http://example.com/file'),
    },
  }),
}));

jest.mock('../../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({
    owner: ['securitySolution'],
  }),
}));

const validFileEntry = {
  name: basicFileMock.name,
  extension: basicFileMock.extension ?? 'png',
  mimeType: basicFileMock.mimeType ?? 'image/png',
  created: basicFileMock.created,
};

const euiTheme = {} as unknown as EuiThemeComputed<{}>;

const attachmentProps: FileViewProps = {
  savedObjectId: 'test-so-id',
  attachmentId: basicFileMock.id,
  metadata: { files: [validFileEntry], soType: FILE_SO_TYPE },
  createdBy: { username: 'elastic', fullName: null, email: null, profileUid: undefined },
  version: '1',
  caseData: { title: basicCase.title, id: basicCase.id },
  rowContext: {
    appId: 'cases',
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    euiTheme,
  },
};

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
