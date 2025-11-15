/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import * as userEventLib from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { HttpSetup } from '@kbn/core/public';

import { WithAppDependencies } from '../helpers';
import { EditPolicy } from '../../public/application/sections/edit_policy';
import type { AppServicesContext } from '../../public/types';
import { POLICY_NAME } from './constants';

export interface InitTestBed extends RenderResult {
  user: UserEvent;
}

export const initTestBed = (
  httpSetup: HttpSetup,
  arg?: {
    appServicesContext?: Partial<AppServicesContext>;
    initialEntries?: string[];
    componentRoutePath?: string;
  }
): InitTestBed => {
  const { appServicesContext, initialEntries, componentRoutePath } = arg || {};

  const user = userEventLib.default.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0, // Skip pointer-events check for EUI popovers/portals
  });

  // Determine if this is a new policy based on the route
  const isNewPolicyRoute = initialEntries?.[0] === '/policies/edit';
  const policyName = isNewPolicyRoute ? '' : POLICY_NAME;
  const routePath = isNewPolicyRoute ? '/policies/edit' : `/policies/edit/${POLICY_NAME}`;

  // Create a wrapper component that includes MemoryRouter and routing props
  const EditPolicyWithRouter = () => (
    <MemoryRouter initialEntries={initialEntries || [routePath]}>
      <EditPolicy
        match={{
          params: { policyName },
          isExact: true,
          path:
            componentRoutePath ||
            (isNewPolicyRoute ? '/policies/edit' : '/policies/edit/:policyName'),
          url: routePath,
        }}
        location={{
          pathname: routePath,
          search: '',
          hash: '',
          state: undefined,
        }}
        history={{} as any}
      />
    </MemoryRouter>
  );

  const ComponentWithDependencies = WithAppDependencies(
    EditPolicyWithRouter,
    httpSetup,
    appServicesContext
  );

  const renderResult = render(<ComponentWithDependencies />);

  return {
    user,
    ...renderResult,
  };
};
