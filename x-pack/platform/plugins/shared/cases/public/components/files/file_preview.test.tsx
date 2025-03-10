/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';

import { constructFileKindIdByOwner } from '../../../common/files';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import { basicFileMock } from '../../containers/mock';
import { FilePreview } from './file_preview';

// FLAKY: https://github.com/elastic/kibana/issues/182364
describe.skip('FilePreview', () => {
  let user: UserEvent;
  let appMockRender: AppMockRenderer;

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
    appMockRender = createAppMockRenderer();
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
  });

  it('FilePreview rendered correctly', async () => {
    appMockRender.render(<FilePreview closePreview={jest.fn()} selectedFile={basicFileMock} />);

    await waitFor(() =>
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('pressing escape calls closePreview', async () => {
    const closePreview = jest.fn();

    appMockRender.render(<FilePreview closePreview={closePreview} selectedFile={basicFileMock} />);

    await waitFor(() =>
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        id: basicFileMock.id,
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    // fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(closePreview).toHaveBeenCalled());
  });
});
