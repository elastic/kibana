/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { constructFileKindIdByOwner } from '../../../common/files';
import { mockedTestProvidersOwner, renderWithTestingProviders } from '../../common/mock';
import { basicFileMock } from '../../containers/mock';
import { FilePreview } from './file_preview';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';

describe('FilePreview', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  it('FilePreview rendered correctly', async () => {
    const filesClient = createMockFilesClient();

    renderWithTestingProviders(
      <FilePreview closePreview={jest.fn()} selectedFile={basicFileMock} />,
      { wrapperProps: { filesClient } }
    );

    jest.runAllTimers();

    await waitFor(() =>
      expect(filesClient.getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('pressing escape calls closePreview', async () => {
    const closePreview = jest.fn();
    const filesClient = createMockFilesClient();

    renderWithTestingProviders(
      <FilePreview closePreview={closePreview} selectedFile={basicFileMock} />,
      { wrapperProps: { filesClient } }
    );

    await waitFor(() =>
      expect(filesClient.getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    jest.runAllTimers();

    await waitFor(() => expect(closePreview).toHaveBeenCalled());
  });
});
