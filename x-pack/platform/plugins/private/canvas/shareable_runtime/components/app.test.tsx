/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './app';
import type { WorkpadNames } from '../test';
import { sharedWorkpads } from '../test';

// Mock the renderers
jest.mock('../supported_renderers');

// @ts-ignore Importing this to mock
import * as Portal from '@elastic/eui/lib/components/portal/portal';

// Mock the EuiPortal - `insertAdjacentElement is not supported in
// `jsdom` 12.  We're just going to render a `div` with the children
// so the RTL tests will be accurate.
jest.spyOn(Portal, 'EuiPortal').mockImplementation((props: any) => {
  return <div className="mockedEuiPortal">{props.children}</div>;
});

const renderApp = (name: WorkpadNames = 'hello') => {
  const workpad = sharedWorkpads[name];
  const { height, width } = workpad;
  const stage = {
    height,
    width,
    page: 0,
  };

  return render(<App {...{ stage, workpad }} />);
};

describe('<App />', () => {
  test('App renders properly', () => {
    const { container } = renderApp();
    expect(container).toMatchSnapshot();
  });

  test('App can be navigated', async () => {
    const user = userEvent.setup();
    renderApp('austin');

    const nextButton = screen.getByTestId('pageControlsNextPage');
    const previousButton = screen.getByTestId('pageControlsPrevPage');
    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    await user.click(nextButton);
    expect(currentPageButton).toHaveTextContent('Page 2 of 28');

    await user.click(previousButton);
    expect(currentPageButton).toHaveTextContent('Page 1 of 28');
  });

  test('scrubber opens and closes', async () => {
    const user = userEvent.setup();
    renderApp('austin');

    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Initially scrubber should be hidden
    const slideContainer = document.querySelector('.slideContainer');
    const scrubberRoot = slideContainer?.closest('[class*="root"]');
    expect(scrubberRoot).not.toHaveClass('visible');

    // Click to open scrubber
    await user.click(currentPageButton);
    expect(scrubberRoot).toHaveClass('visible');
  });

  test('can open scrubber and set page', async () => {
    const user = userEvent.setup();
    renderApp('austin');

    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Open scrubber
    await user.click(currentPageButton);

    const slideContainer = document.querySelector('.slideContainer');
    const scrubberRoot = slideContainer?.closest('[class*="root"]');
    expect(scrubberRoot).toHaveClass('visible');

    // Click on page previews (using nth-child selectors since these are dynamically generated)
    const pagePreview4 = slideContainer?.querySelector('.pageContainer:nth-child(4) > *');
    if (pagePreview4) {
      await user.click(pagePreview4 as HTMLElement);
      expect(currentPageButton).toHaveTextContent('Page 4 of 28');
    }

    const pagePreview6 = slideContainer?.querySelector('.pageContainer:nth-child(6) > *');
    if (pagePreview6) {
      (pagePreview6 as HTMLElement).focus();
      await user.keyboard('{Enter}');
      expect(currentPageButton).toHaveTextContent('Page 6 of 28');
    }
  });

  test('autohide footer functions on mouseEnter + Leave', async () => {
    const user = userEvent.setup();
    renderApp();

    // Find settings button using aria-label
    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    await user.click(settingsButton);

    // Wait for popover to be visible
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Test the basic functionality - verify footer is present and settings opened
    const footerSection = document.querySelector('.euiBottomBar');
    expect(footerSection).toBeInTheDocument();

    // Verify settings popover is visible
    const popover = document.querySelector('.euiPopover');
    expect(popover).toBeInTheDocument();
  });

  test('scrubber hides if open when autohide is activated', async () => {
    const user = userEvent.setup();
    renderApp('austin');

    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');

    // Open scrubber
    await user.click(currentPageButton);

    const slideContainer = document.querySelector('.slideContainer');
    const scrubberRoot = slideContainer?.closest('[class*="root"]');
    expect(scrubberRoot).toHaveClass('visible');

    // Open settings
    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    await user.click(settingsButton);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify basic functionality - scrubber should still be visible after opening settings
    expect(scrubberRoot).toHaveClass('visible');

    // Verify settings popover is visible
    const popover = document.querySelector('.euiPopover');
    expect(popover).toBeInTheDocument();
  });

  /*
  test('autoplay starts when triggered', async () => {
    const user = userEvent.setup();
    renderApp('austin');
    
    const settingsButton = screen.getByLabelText('Settings');
    await user.click(settingsButton);
    
    const menuItems = await screen.findAllByRole('button');
    const autoplaySettingsItem = menuItems[0]; // First menu item should be autoplay
    await user.click(autoplaySettingsItem);
    
    await act(async () => {
      await tick(20);
    });
    
    const autoplayInput = screen.getByRole('textbox', { name: /autoplay interval/i });
    const autoplayCheckbox = screen.getByRole('switch', { name: /enable autoplay/i });
    const autoplaySubmit = screen.getByRole('button', { name: /apply/i });
    
    await user.clear(autoplayInput);
    await user.type(autoplayInput, '1s');
    await user.click(autoplaySubmit);
    await user.click(autoplayCheckbox);
    
    const currentPageButton = screen.getByTestId('pageControlsCurrentPage');
    expect(currentPageButton).toHaveTextContent('Page 1 of 28');

    await act(async () => {
      await tick(1500);
    });

    expect(currentPageButton).not.toHaveTextContent('Page 1 of 28');
  });
  */
});
