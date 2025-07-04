/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { mockedTestProvidersOwner, renderWithTestingProviders } from '../../common/mock';
import { FileDownloadButton } from './file_download_button';
import { basicFileMock } from '../../containers/mock';
import { constructFileKindIdByOwner } from '../../../common/files';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';

describe('FileDownloadButton', () => {
  describe('isIcon', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders download button with correct href', async () => {
      const filesClient = createMockFilesClient();
      renderWithTestingProviders(<FileDownloadButton fileId={basicFileMock.id} isIcon={true} />, {
        wrapperProps: { filesClient },
      });

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      expect(filesClient.getDownloadHref).toBeCalledTimes(1);
      expect(filesClient.getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });
  });

  describe('not isIcon', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders download button with correct href', async () => {
      const filesClient = createMockFilesClient();
      renderWithTestingProviders(<FileDownloadButton fileId={basicFileMock.id} />, {
        wrapperProps: { filesClient },
      });

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      expect(filesClient.getDownloadHref).toBeCalledTimes(1);
      expect(filesClient.getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });
  });
});
