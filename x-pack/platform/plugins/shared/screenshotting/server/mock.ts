/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockBrowserDriverFactory } from './browsers/mock';
import { createMockScreenshots } from './screenshots/mock';
import type { ScreenshottingStart } from '.';

export function createMockScreenshottingStart(): jest.Mocked<ScreenshottingStart> {
  const driver = createMockBrowserDriverFactory();
  const { getScreenshots } = createMockScreenshots();
  const { diagnose } = driver;

  return {
    diagnose,
    getScreenshots,
  };
}
