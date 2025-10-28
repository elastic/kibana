/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JestContext } from '../../test/context_jest';
import { Footer } from './footer';

jest.mock('../../supported_renderers');

describe('<Footer />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });

  test('scrubber functions properly', async () => {
    const user = userEvent.setup();

    render(
      <JestContext>
        <Footer />
      </JestContext>
    );

    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Initially scrubber should be hidden (slideContainer should not have visible class)
    const slideContainer = document.querySelector('.slideContainer');
    expect(slideContainer).toBeInTheDocument();

    // Click the current page button to toggle scrubber visibility
    await user.click(currentPageButton);

    // After clicking, scrubber should be visible
    // We can verify this by checking if the scrubber root element has the visible class
    const scrubberRoot = slideContainer?.closest('[class*="root"]');
    expect(scrubberRoot).toHaveClass('visible');
  });
});
