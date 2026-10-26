/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StreamingText } from './streaming_text';

jest.mock('./chat_message_text', () => ({
  ChatMessageText: ({ content }: { content: string }) => (
    <div data-test-subj="streamedText">{content}</div>
  ),
}));

const TOKEN_DELAY = 17;
const shownText = () => screen.getByTestId('streamedText').textContent;
const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ');

describe('StreamingText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the content it mounts with right away', () => {
    render(<StreamingText content="Already here" steps={[]} />);

    expect(shownText()).toBe('Already here');
  });

  it('keeps typing when new content arrives faster than one token per tick', () => {
    const { rerender } = render(<StreamingText content="" steps={[]} />);

    let content = '';
    for (let i = 0; i < 10; i++) {
      content += `word${i} `;
      rerender(<StreamingText content={content} steps={[]} />);
      act(() => {
        jest.advanceTimersByTime(TOKEN_DELAY - 7);
      });
    }

    expect(shownText()).not.toBe('');
    expect(content.startsWith(shownText() ?? '')).toBe(true);
  });

  it('catches up quickly with a long backlog', () => {
    const { rerender } = render(<StreamingText content="" steps={[]} />);
    const content = words(200);

    rerender(<StreamingText content={content} steps={[]} />);
    act(() => {
      jest.advanceTimersByTime(TOKEN_DELAY * 100);
    });

    expect(shownText()).toBe(content);
  });
});
