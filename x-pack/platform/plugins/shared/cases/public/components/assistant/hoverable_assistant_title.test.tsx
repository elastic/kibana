/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { HoverableAssistantTitle } from './hoverable_assistant_title';

describe('HoverableAssistantTitle', () => {
  it('renders assistant title', async () => {
    render(<HoverableAssistantTitle />);

    expect(screen.getByTestId('assistant-title')).toBeInTheDocument();
  });

  it('renders the tooltip when hovering', async () => {
    render(<HoverableAssistantTitle />);

    fireEvent.mouseOver(screen.getByText('Assistant'));

    const assistantTooltip = within(await screen.findByTestId('assistant-tooltip'));

    expect(assistantTooltip.getByText('Assistant')).toBeInTheDocument();
  });
});
