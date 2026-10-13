/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GroupedAttachmentRow } from './grouped_attachment_row';

describe('GroupedAttachmentRow', () => {
  it('links to a new tab for a page action', () => {
    render(
      <GroupedAttachmentRow
        iconType="warning"
        iconColor="danger"
        title="5 alerts"
        action={{ kind: 'page', href: '/app/security/alerts' }}
      />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/app/security/alerts');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('groupedAttachmentRowAffordance')).toHaveAttribute(
      'data-euiicon-type',
      'external'
    );
  });

  it('runs the handler for a flyout action', () => {
    const onClick = jest.fn();
    render(
      <GroupedAttachmentRow
        iconType="document"
        iconColor="subdued"
        title="External mailbox forwarding"
        subtitle="Rule"
        action={{ kind: 'flyout', onClick }}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByTestId('groupedAttachmentRowAffordance')).toHaveAttribute(
      'data-euiicon-type',
      'maximize'
    );
  });

  it('shows no tooltip while the title fits', () => {
    render(
      <GroupedAttachmentRow
        iconType="document"
        iconColor="subdued"
        title="Short"
        action={{ kind: 'flyout', onClick: jest.fn() }}
      />
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
