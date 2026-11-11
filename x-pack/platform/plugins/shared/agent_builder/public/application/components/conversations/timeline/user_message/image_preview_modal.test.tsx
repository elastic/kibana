/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { useObjectUrl } from './use_object_url';
import { ImagePreviewModal } from './image_preview_modal';

jest.mock('./use_object_url', () => ({
  useObjectUrl: jest.fn(),
}));

const mockUseObjectUrl = jest.mocked(useObjectUrl);

const SRC = '/api/files/files/agentBuilderChatImages/file-1/blob';
const OBJECT_URL = 'blob:http://localhost/object-url';

const render = () =>
  rtlRender(
    <EuiThemeProvider>
      <ImagePreviewModal src={SRC} label="photo.png" onClose={jest.fn()} />
    </EuiThemeProvider>
  );

describe('ImagePreviewModal', () => {
  beforeEach(() => {
    mockUseObjectUrl.mockReset();
  });

  it('hides the actions until the object URL is ready', () => {
    mockUseObjectUrl.mockReturnValue(undefined);
    render();

    expect(screen.queryByTestId('agentBuilderImagePreviewDownload')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderImagePreviewOpenFullScreen')).not.toBeInTheDocument();
  });

  it('links Download and Open full screen to the object URL', () => {
    mockUseObjectUrl.mockReturnValue(OBJECT_URL);
    render();

    const download = screen.getByTestId('agentBuilderImagePreviewDownload');
    expect(download).toHaveAttribute('href', OBJECT_URL);
    expect(download).toHaveAttribute('download', 'photo.png');

    const openFullScreen = screen.getByTestId('agentBuilderImagePreviewOpenFullScreen');
    expect(openFullScreen).toHaveAttribute('href', OBJECT_URL);
    expect(openFullScreen).toHaveAttribute('target', '_blank');
  });
});
