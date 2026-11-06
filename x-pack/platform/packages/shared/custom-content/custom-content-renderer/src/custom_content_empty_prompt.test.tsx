/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomContentEmptyPrompt } from './custom_content_empty_prompt';

describe('CustomContentEmptyPrompt', () => {
  it('renders the title', () => {
    render(<CustomContentEmptyPrompt isAiAvailable={false} />);
    expect(screen.getByText('Create your custom panel')).toBeInTheDocument();
  });

  it('renders the body text when AI is not available', () => {
    render(<CustomContentEmptyPrompt isAiAvailable={false} />);
    expect(
      screen.getByText('Use HTML, CSS, Liquid, and ES|QL to create your custom panel')
    ).toBeInTheDocument();
  });

  it('renders example prompts when AI is available', () => {
    render(<CustomContentEmptyPrompt isAiAvailable={true} />);
    expect(
      screen.getByText(
        'Examples: "Create a health status card for each of my hosts", "Create a banner with an animated image", "Show how data flows across my services".'
      )
    ).toBeInTheDocument();
  });

  it('does not render the Generate with chat button when isAiAvailable is false', () => {
    const onGenerateWithChat = jest.fn();
    render(
      <CustomContentEmptyPrompt isAiAvailable={false} onGenerateWithChat={onGenerateWithChat} />
    );
    expect(screen.queryByRole('button', { name: 'Generate with chat' })).not.toBeInTheDocument();
  });

  it('does not render the Generate with chat button when onGenerateWithChat is undefined', () => {
    render(<CustomContentEmptyPrompt isAiAvailable={true} />);
    expect(screen.queryByRole('button', { name: 'Generate with chat' })).not.toBeInTheDocument();
  });

  it('renders the Generate with chat button when isAiAvailable is true and onGenerateWithChat is provided', () => {
    const onGenerateWithChat = jest.fn();
    render(
      <CustomContentEmptyPrompt isAiAvailable={true} onGenerateWithChat={onGenerateWithChat} />
    );
    expect(screen.getByRole('button', { name: 'Generate with chat' })).toBeInTheDocument();
  });

  it('calls onGenerateWithChat when the button is clicked', async () => {
    const onGenerateWithChat = jest.fn();
    render(
      <CustomContentEmptyPrompt isAiAvailable={true} onGenerateWithChat={onGenerateWithChat} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Generate with chat' }));

    expect(onGenerateWithChat).toHaveBeenCalledTimes(1);
  });
});
