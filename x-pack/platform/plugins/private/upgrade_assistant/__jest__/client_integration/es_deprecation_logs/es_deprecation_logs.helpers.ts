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

export type EsDeprecationLogsTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */

  const clickOpenFlyoutLoggingEnabled = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('viewDetailsLink').simulate('click');
    });

    component.update();
  };
  const clickOpenFlyoutLoggingDisabled = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('enableLogsLink').simulate('click');
    });

    component.update();
  };

  const clickDeprecationToggle = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('deprecationLoggingToggle').simulate('click');
    });

    component.update();
  };

  const clickResetButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('resetLastStoredDate').simulate('click');
    });

    component.update();
  };
  const clickCloseFlyout = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('closeEsDeprecationLogs').simulate('click');
    });

    component.update();
  };

  return {
    clickOpenFlyoutLoggingEnabled,
    clickOpenFlyoutLoggingDisabled,
    clickDeprecationToggle,
    clickResetButton,
    clickCloseFlyout,
  };
};

export const setupESDeprecationLogsPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<EsDeprecationLogsTestBed> => {
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
