/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageAttachmentChildren } from './attachment_children';
import type { PageAttachmentPersistedState } from './types';

describe('PageAttachmentChildren', () => {
  const mockPersistableState: PageAttachmentPersistedState = {
    label: 'Test Page',
    icon: 'link',
    snapshot: {
      imgData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
    },
    type: 'mockType',
    url: {
      pathAndQuery: '/test/path?query=1',
      label: 'Test Link',
    },
  };

  it('renders the link with correct label and href', () => {
    render(<PageAttachmentChildren persistableStateAttachmentState={mockPersistableState} />);

    const link = screen.getByRole('link', { name: 'Test Page' });
    expect(link).toHaveAttribute('href', '/test/path');
  });

  it('renders the image when snapshot data is provided', () => {
    render(<PageAttachmentChildren persistableStateAttachmentState={mockPersistableState} />);

    const image = screen.getByAltText('screenshot');
    expect(image).toHaveAttribute('src', mockPersistableState.snapshot?.imgData);
  });

  it('does not render the image when snapshot data is missing', () => {
    const stateWithoutSnapshot = { ...mockPersistableState, snapshot: null };
    render(<PageAttachmentChildren persistableStateAttachmentState={stateWithoutSnapshot} />);

    const image = screen.queryByAltText('screenshot');
    expect(image).not.toBeInTheDocument();
  });
});
