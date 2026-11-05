/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicFileMock } from '../../../containers/mock';
import { FileNameLink } from './file_name_link';

// Failing: See https://github.com/elastic/kibana/issues/207369
describe('FileNameLink', () => {
  const defaultProps = {
    file: basicFileMock,
    showPreview: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clickable name if file is image', async () => {
    render(<FileNameLink {...defaultProps} />);

    const nameLink = await screen.findByTestId('cases-files-name-link');

    expect(nameLink).toBeInTheDocument();

    await userEvent.click(nameLink);

    expect(defaultProps.showPreview).toHaveBeenCalled();
  });

  it('renders simple text name if file is not image', async () => {
    render(
      <FileNameLink
        showPreview={defaultProps.showPreview}
        file={{ ...basicFileMock, mimeType: 'text/csv' }}
      />
    );

    const nameLink = await screen.findByTestId('cases-files-name-text');

    expect(nameLink).toBeInTheDocument();

    await userEvent.click(nameLink);

    expect(defaultProps.showPreview).not.toHaveBeenCalled();
  });

  it('renders simple text name for an image when preview is disabled', async () => {
    render(<FileNameLink {...defaultProps} canPreview={false} />);

    const nameText = await screen.findByTestId('cases-files-name-text');

    expect(nameText).toBeInTheDocument();
    expect(screen.queryByTestId('cases-files-name-link')).not.toBeInTheDocument();

    await userEvent.click(nameText);

    expect(defaultProps.showPreview).not.toHaveBeenCalled();
  });
});
