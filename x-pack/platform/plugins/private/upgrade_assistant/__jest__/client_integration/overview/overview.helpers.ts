/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { Overview } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/overview`],
    componentRoutePath: '/overview',
  },
  doMountAsync: true,
};

export type OverviewTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */

  const clickViewSystemIndicesState = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('viewSystemIndicesStateButton').simulate('click');
    });

    component.update();
  };

  const clickRetrySystemIndicesButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('systemIndicesStatusRetryButton').simulate('click');
    });

    component.update();
  };

  return {
    clickViewSystemIndicesState,
    clickRetrySystemIndicesButton,
  };
};

export const setupOverviewPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<OverviewTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(Overview, httpSetup, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
