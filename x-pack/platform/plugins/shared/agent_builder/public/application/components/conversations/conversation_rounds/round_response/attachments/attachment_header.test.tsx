/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentHeader } from './attachment_header';

const actionButton = {
  label: 'Open in Discover',
  type: ActionButtonType.SECONDARY,
  handler: jest.fn(),
};

describe('AttachmentHeader', () => {
  it('renders nothing when there are no action or close buttons', () => {
    const { container } = render(<AttachmentHeader title="Attachment title" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title when the attachment type opts into alwaysShowHeader', () => {
    render(<AttachmentHeader title="Attachment title" alwaysShowHeader />);

    expect(screen.getByText('Attachment title')).toBeInTheDocument();
  });

  it('renders the title when there are action buttons without opting in', () => {
    render(<AttachmentHeader title="Attachment title" actionButtons={[actionButton]} />);

    expect(screen.getByText('Attachment title')).toBeInTheDocument();
    expect(screen.getByText('Open in Discover')).toBeInTheDocument();
  });

  it('renders the close button when onClose is provided without opting in', () => {
    render(<AttachmentHeader title="Attachment title" onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('omits the trailing actions column when opted in with no buttons', () => {
    render(<AttachmentHeader title="Attachment title" alwaysShowHeader />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
