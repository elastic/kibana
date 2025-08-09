/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JestContext } from '../test/context_jest';
import { Canvas } from './canvas';

jest.mock('../supported_renderers');

describe('<Canvas />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<Canvas />);
    expect(container.firstChild).toBeNull();
  });

  test('scrubber opens and closes', async () => {
    const user = userEvent.setup();

    render(
      <JestContext source="austin">
        <Canvas />
      </JestContext>
    );

    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Initially scrubber should be hidden
    const slideContainer = document.querySelector('.slideContainer');
    const scrubberRoot = slideContainer?.closest('[class*="root"]');
    expect(scrubberRoot).not.toHaveClass('visible');

    // Click to open scrubber
    await user.click(currentPageButton);
    expect(scrubberRoot).toHaveClass('visible');
  });
});
