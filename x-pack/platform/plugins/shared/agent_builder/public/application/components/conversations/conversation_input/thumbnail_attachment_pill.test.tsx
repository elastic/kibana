/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { ThumbnailAttachmentPill } from './thumbnail_attachment_pill';

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

const baseProps = {
  attachmentId: 'img1',
  thumbnailUrl: 'data:image/png;base64,abc',
  label: 'photo.png',
};

describe('ThumbnailAttachmentPill', () => {
  it('renders a view button that calls onClick when onClick is set', () => {
    const onClick = jest.fn();
    render(<ThumbnailAttachmentPill {...baseProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'View image photo.png' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a view button when onClick is not set', () => {
    render(<ThumbnailAttachmentPill {...baseProps} onRemoveAttachment={jest.fn()} />);

    expect(screen.queryByTestId('agentBuilderAttachmentPillView-img1')).not.toBeInTheDocument();
  });
});
