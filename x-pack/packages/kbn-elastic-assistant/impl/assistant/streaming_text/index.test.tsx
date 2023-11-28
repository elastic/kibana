/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StreamingText } from '.';

describe('StreamingText', () => {
  it('renders text with a streaming effect', async () => {
    const text = 'Stream stream stream your boat...';
    const chunkSize = 5;
    const delay = 50;

    render(<StreamingText text={text} chunkSize={chunkSize} delay={delay} />);

    let displayedText = '';
    const expectedChunks = Math.ceil(text.length / chunkSize);

    for (let i = 0; i < expectedChunks; i++) {
      displayedText += text.substring(i * chunkSize, (i + 1) * chunkSize);
      await waitFor(() => {
        expect(screen.getByText(displayedText)).toBeInTheDocument();
      });
    }
  });
});
