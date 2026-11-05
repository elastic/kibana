/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import {
  getLoader,
  subscribeLoaders,
  type LoaderId,
  type LoaderScenario,
} from './loader_preference';

/** The loader currently selected for one scenario. */
export const useLoader = (scenario: LoaderScenario): LoaderId =>
  useSyncExternalStore(
    subscribeLoaders,
    () => getLoader(scenario),
    () => getLoader(scenario)
  );
