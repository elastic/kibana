/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import * as userEventLib from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { HttpSetup } from '@kbn/core/public';
import { scopedHistoryMock } from '@kbn/core/public/mocks';
import { App } from '../../public/application/app';
import { WithAppDependencies } from '../helpers';

export interface AppTestBed extends RenderResult {
  user: UserEvent;
  actions: {
    clickPolicyNameLink: () => Promise<void>;
    clickCreatePolicyButton: () => Promise<void>;
    clickEditPolicyButton: () => Promise<void>;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  initialEntries: string[]
): Promise<AppTestBed> => {
  const user = userEventLib.default.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0,
  });

  // Create a scoped history mock with initial entries
  const history = scopedHistoryMock.create();

  // Store listeners for history changes
  const listeners: Array<(location: any, action: any) => void> = [];

  history.createHref.mockImplementation((location) => {
    if (typeof location === 'string') {
      return location;
    }
    return location.pathname || '/';
  });

  // Mock listen to store listeners
  history.listen.mockImplementation((listener) => {
    listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  });

  // Mock push to actually update the location and notify listeners
  history.push.mockImplementation((path) => {
    const pathname = typeof path === 'string' ? path : path.pathname || '/';
    const search = typeof path === 'string' ? '' : path.search || '';
    history.location = {
      ...history.location,
      pathname,
      search,
    };
    history.action = 'PUSH';
    // Notify all listeners with location and action
    listeners.forEach((listener) => listener(history.location, history.action));
  });

  // Set the initial location
  // React Router decodes the pathname once, so we need to do the same
  if (initialEntries.length > 0) {
    try {
      history.location.pathname = decodeURI(initialEntries[0]);
    } catch (e) {
      // If decoding fails, use the original pathname
      history.location.pathname = initialEntries[0];
    }
  }

  const AppWithDependencies = WithAppDependencies(App, httpSetup);

  const renderResult = render(<AppWithDependencies history={history} />);

  // Wait for initial HTTP requests to complete
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });

  return {
    ...renderResult,
    user,
    actions: {
      async clickPolicyNameLink() {
        const link = screen.getByTestId('policyTablePolicyNameLink');
        await user.click(link);
        // Wait for flyout to open and any async operations
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      },

      async clickCreatePolicyButton() {
        const button = screen.getByTestId('createPolicyButton');
        await user.click(button);
        // Wait for navigation and any async operations
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
      },

      async clickEditPolicyButton() {
        const button = screen.getByTestId('editPolicy');
        await user.click(button);
      },
    },
  };
};

export const getEncodedPolicyEditPath = (policyName: string): string =>
  `/policies/edit/${encodeURIComponent(policyName)}`;

export const getDoubleEncodedPolicyEditPath = (policyName: string): string =>
  encodeURI(getEncodedPolicyEditPath(policyName));
