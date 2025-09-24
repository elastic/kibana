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
import { PageControls } from './page_controls';

jest.mock('../../supported_renderers');

describe('<PageControls />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<PageControls />);
    expect(container.firstChild).toBeNull();
  });

  test('hello: renders as expected', () => {
    render(
      <JestContext source="hello">
        <PageControls />
      </JestContext>
    );

    const previousButton = screen.getByTestId('pageControlsPrevPage');
    const nextButton = screen.getByTestId('pageControlsNextPage');
    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
    expect(currentPageButton).toHaveTextContent('Page 1');
  });

  test('austin: renders as expected', () => {
    render(
      <JestContext source="austin">
        <PageControls />
      </JestContext>
    );

    const previousButton = screen.getByTestId('pageControlsPrevPage');
    const nextButton = screen.getByTestId('pageControlsNextPage');
    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(currentPageButton).toHaveTextContent('Page 1 of 28');
  });

  test('austin: moves between pages', async () => {
    const user = userEvent.setup();

    render(
      <JestContext source="austin">
        <PageControls />
      </JestContext>
    );

    const previousButton = screen.getByTestId('pageControlsPrevPage');
    const nextButton = screen.getByTestId('pageControlsNextPage');
    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Click next to go to page 2
    await user.click(nextButton);
    expect(currentPageButton).toHaveTextContent('Page 2 of 28');

    // Click next to go to page 3
    await user.click(nextButton);
    expect(currentPageButton).toHaveTextContent('Page 3 of 28');

    // Click previous to go back to page 2
    await user.click(previousButton);
    expect(currentPageButton).toHaveTextContent('Page 2 of 28');
  });
});
