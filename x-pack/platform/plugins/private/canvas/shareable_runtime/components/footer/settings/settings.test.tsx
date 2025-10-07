/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JestContext } from '../../../test/context_jest';
import { Settings } from './settings';

jest.mock('../../../supported_renderers');

// @ts-ignore Importing this to mock
import * as Portal from '@elastic/eui/lib/components/portal/portal';

// Mock the EuiPortal - `insertAdjacentElement is not supported in
// `jsdom` 12.  We're just going to render a `div` with the children
// so the tests will be accurate.
jest.spyOn(Portal, 'EuiPortal').mockImplementation((props: any) => {
  return <div className="mockedEuiPortal">{props.children}</div>;
});

describe('<Settings />', () => {
  const renderSettings = () => {
    const ref = React.createRef<HTMLDivElement>();
    return render(
      <JestContext stageRef={ref}>
        <div ref={ref}>
          <Settings />
        </div>
      </JestContext>
    );
  };

  test('renders as expected', () => {
    renderSettings();

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();

    // Portal should not be visible initially
    expect(screen.queryByText('Auto Play')).not.toBeInTheDocument();
  });

  test('clicking settings opens and closes the menu', async () => {
    const user = userEvent.setup();
    renderSettings();

    const settingsButton = screen.getByRole('button', { name: /settings/i });

    // Open the popover
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto Play')).toBeInTheDocument();
      expect(screen.getByText('Toolbar')).toBeInTheDocument();
    });

    // Close the popover
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  test('can navigate Autoplay Settings', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderSettings();

    const settingsButton = screen.getByRole('button', { name: /settings/i });

    // Open the settings menu
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Click on Auto Play menu item - use getByRole to be more specific
    const autoPlayMenuItem = screen.getByRole('button', { name: 'Auto Play' });
    await user.click(autoPlayMenuItem);

    await waitFor(() => {
      // Should show autoplay specific controls - "Cycle Slides" is the actual text
      expect(screen.getByText('Cycle Slides')).toBeInTheDocument();
    });
  });

  test('can navigate Toolbar Settings, closes when activated', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderSettings();

    const settingsButton = screen.getByRole('button', { name: /settings/i });

    // Open the settings menu
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Click on Toolbar menu item - use getByRole to be more specific
    const toolbarMenuItem = screen.getByRole('button', { name: 'Toolbar' });
    await user.click(toolbarMenuItem);

    await waitFor(() => {
      // Should show the toolbar settings panel
      expect(screen.getByText('Hide Toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('hideToolbarSwitch')).toBeInTheDocument();
    });

    // Click the Hide Toolbar switch
    const hideToolbarSwitch = screen.getByTestId('hideToolbarSwitch');
    await user.click(hideToolbarSwitch);

    // The popover should close after clicking the switch
    await waitFor(() => {
      expect(screen.queryByText('Toolbar')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide Toolbar')).not.toBeInTheDocument();
    });
  });
});
