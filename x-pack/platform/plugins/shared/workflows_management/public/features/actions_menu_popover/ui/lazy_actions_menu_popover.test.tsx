/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import type { ActionsMenuPopoverProps } from './actions_menu_popover';
import {
  ActionsMenuPopover,
  preloadActionsMenu,
  useWarmActionsMenu,
} from './lazy_actions_menu_popover';

const mockMenuModuleLoaded = jest.fn();

jest.mock('./actions_menu_popover', () => {
  mockMenuModuleLoaded();
  return {
    ActionsMenuPopover: ({ rootTitle }: { rootTitle?: string }) => (
      <div data-test-subj="loadedActionsMenu">{rootTitle}</div>
    ),
  };
});

const popoverProps = (overrides: Partial<ActionsMenuPopoverProps> = {}) =>
  ({
    isOpen: true,
    closePopover: jest.fn(),
    onActionSelected: jest.fn(),
    rootTitle: 'Add a step',
    ...overrides,
  } as ActionsMenuPopoverProps);

const Warm = () => {
  useWarmActionsMenu();
  return null;
};

// Once the menu module has loaded, the module registry keeps it for the rest of the file, so the
// "not loaded yet" checks come first and the "loaded exactly once" checks after them, in order.
describe('lazy ActionsMenuPopover', () => {
  describe('before anything asks for the menu', () => {
    it('renders nothing and does not fetch the menu while closed', () => {
      const { container } = render(<ActionsMenuPopover {...popoverProps({ isOpen: false })} />);

      expect(container).toBeEmptyDOMElement();
      expect(mockMenuModuleLoaded).not.toHaveBeenCalled();
    });

    describe('useWarmActionsMenu', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('does not fetch when the editor unmounts before the idle moment', async () => {
        const { unmount } = render(<Warm />);
        unmount();
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });

        expect(mockMenuModuleLoaded).not.toHaveBeenCalled();
      });

      it('fetches the menu once the browser is idle', async () => {
        render(<Warm />);
        expect(mockMenuModuleLoaded).not.toHaveBeenCalled();

        await act(async () => {
          jest.advanceTimersByTime(5000);
        });

        expect(mockMenuModuleLoaded).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('after the menu was fetched', () => {
    it('renders the menu with the same props once opened, without a second fetch', async () => {
      render(<ActionsMenuPopover {...popoverProps()} />);

      expect(await screen.findByTestId('loadedActionsMenu')).toHaveTextContent('Add a step');
      expect(mockMenuModuleLoaded).toHaveBeenCalledTimes(1);
    });

    it('shares one load however often it is preloaded', async () => {
      await preloadActionsMenu();
      await preloadActionsMenu();

      expect(mockMenuModuleLoaded).toHaveBeenCalledTimes(1);
    });
  });
});
