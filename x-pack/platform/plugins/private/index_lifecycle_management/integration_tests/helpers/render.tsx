/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import * as userEventLib from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { HttpSetup } from '@kbn/core/public';
import type { AppServicesContext } from '../../public/types';

import { WithAppDependencies } from './setup_environment';

export interface BaseTestBed extends RenderResult {
  user: UserEvent;
}

/**
 * Render helper for ILM components with app dependencies.
 * Returns a user event instance configured for fake timers.
 *
 * @example
 * const { user } = renderWithDependencies(MyComponent, {
 *   httpSetup,
 * });
 */
export const renderWithDependencies = (
  Component: React.ComponentType<any>,
  {
    httpSetup,
    appServicesContext,
    props = {},
  }: {
    httpSetup: HttpSetup;
    appServicesContext?: Partial<AppServicesContext>;
    props?: Record<string, unknown>;
  }
): BaseTestBed => {
  const user = userEventLib.default.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0, // Skip pointer-events check for EUI popovers/portals
  });

  const ComponentWithDependencies = WithAppDependencies(Component, httpSetup, appServicesContext);

  const renderResult = render(<ComponentWithDependencies {...props} />);

  return {
    user,
    ...renderResult,
  };
};
