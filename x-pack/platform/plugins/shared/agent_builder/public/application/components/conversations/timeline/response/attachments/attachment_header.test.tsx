/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttachmentHeader } from './attachment_header';

const badges = [{ label: 'Unsaved', color: 'primary', iconType: 'save' }];

describe('AttachmentHeader badges', () => {
  it('renders the badge label in the canvas', () => {
    render(<AttachmentHeader title="Rule" badges={badges} isCanvas onClose={jest.fn()} />);

    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(screen.queryByTestId('attachmentHeaderIconBadge')).not.toBeInTheDocument();
  });

  it('renders an icon-only badge with an accessible label inline', () => {
    render(<AttachmentHeader title="Rule" badges={badges} onClose={jest.fn()} />);

    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
    expect(screen.getByTestId('attachmentHeaderIconBadge')).toHaveAttribute(
      'aria-label',
      'Unsaved'
    );
  });
});
