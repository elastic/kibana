/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';
import { ConversationStatusIndicator } from './conversation_status_indicator';

describe('ConversationStatusIndicator', () => {
  it.each([
    [ConversationDisplayStatus.inProgress, 'Working'],
    [ConversationDisplayStatus.awaitingPrompt, 'Waiting for input'],
    [ConversationDisplayStatus.unread, 'New'],
    [ConversationDisplayStatus.error, 'Error'],
  ])('shows the %s status name in a tooltip on hover', async (status, label) => {
    render(<ConversationStatusIndicator status={status} />);

    const icon = screen.queryByLabelText(label) ?? screen.getByText(label);
    fireEvent.mouseOver(icon);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
  });

  it('renders nothing for a read conversation', () => {
    const { container } = render(
      <ConversationStatusIndicator status={ConversationDisplayStatus.read} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
