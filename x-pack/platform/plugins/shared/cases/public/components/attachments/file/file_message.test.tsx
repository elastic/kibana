/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';

import { allCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import { basicCase, basicFileMock } from '../../../containers/mock';
import type { FileMessageProps } from './file_message';
import { FileMessage } from './file_message';

const imageFile = {
  name: basicFileMock.name,
  extension: 'png',
  mimeType: 'image/png',
  created: basicFileMock.created,
};

const props: FileMessageProps = {
  savedObjectId: 'test-so-id',
  attachmentId: basicFileMock.id,
  data: { content: 'see attached' },
  metadata: { files: [imageFile], soType: FILE_SO_TYPE },
  createdBy: { username: 'elastic', fullName: null, email: null, profileUid: undefined },
  version: '1',
  caseData: { title: basicCase.title, id: basicCase.id },
  permissions: allCasesPermissions(),
  rowContext: {
    appId: 'cases',
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    euiTheme: {} as EuiThemeComputed<{}>,
  },
};

describe('FileMessage', () => {
  it('renders the message text and the image thumbnail', () => {
    renderWithTestingProviders(<FileMessage {...props} />);

    expect(screen.getByText('see attached')).toBeInTheDocument();
    expect(screen.getByTestId('cases-files-image-thumbnail')).toBeInTheDocument();
  });

  it('renders only the text for a non-image file', () => {
    renderWithTestingProviders(
      <FileMessage
        {...props}
        metadata={{ files: [{ ...imageFile, mimeType: 'application/pdf' }], soType: FILE_SO_TYPE }}
      />
    );

    expect(screen.getByText('see attached')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-image-thumbnail')).not.toBeInTheDocument();
  });
});
