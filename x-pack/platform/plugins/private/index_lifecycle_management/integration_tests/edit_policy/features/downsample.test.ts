/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { DownsampleTestBed, setupDownsampleTestBed } from './downsample.helpers';

describe('<EditPolicy /> downsample', () => {
  let testBed: DownsampleTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupDownsampleTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();

    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
  });

  test('enabling downsample in hot should hide readonly in hot, warm and cold', async () => {
    const { actions } = testBed;

    expect(actions.hot.readonlyExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();

    await actions.hot.downsample.toggle();

    expect(actions.hot.readonlyExists()).toBeFalsy();
    expect(actions.warm.readonlyExists()).toBeFalsy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
  });

  test('enabling downsample in warm should hide readonly in warm and cold', async () => {
    const { actions } = testBed;

    expect(actions.hot.readonlyExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();

    await actions.warm.downsample.toggle();

    expect(actions.hot.readonlyExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeFalsy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
  });

  test('enabling downsample in cold should hide readonly in cold', async () => {
    const { actions } = testBed;

    expect(actions.hot.readonlyExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();

    await actions.cold.downsample.toggle();

    expect(actions.hot.readonlyExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
  });
});
