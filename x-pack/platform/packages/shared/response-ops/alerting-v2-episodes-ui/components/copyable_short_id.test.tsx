/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyableShortId } from './copyable_short_id';

const FULL_ID = 'abcdefg-hijklmnop-1234567890';

const renderComponent = () =>
  render(
    <CopyableShortId
      id={FULL_ID}
      copyTooltip={`Click to copy the full ID: ${FULL_ID}`}
      copiedTooltip="ID copied"
      data-test-subj="shortId"
    />
  );

describe('CopyableShortId', () => {
  it('renders only the first seven characters inside a code element', () => {
    renderComponent();

    const code = screen.getByTestId('shortId').querySelector('code');
    expect(code).toHaveTextContent('abcdefg');
    expect(code).not.toHaveTextContent(FULL_ID);
  });

  it('copies the full id on click and announces it', async () => {
    const user = userEvent.setup();
    const mockExecCommand = jest.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    renderComponent();

    await user.click(screen.getByTestId('shortId'));

    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    // Rendered twice: the tooltip and the screen reader live region.
    expect(await screen.findAllByText('ID copied')).not.toHaveLength(0);
  });

  it('shows the full id in the tooltip on hover', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.hover(screen.getByTestId('shortId'));

    expect(await screen.findByText(`Click to copy the full ID: ${FULL_ID}`)).toBeInTheDocument();
  });
});
