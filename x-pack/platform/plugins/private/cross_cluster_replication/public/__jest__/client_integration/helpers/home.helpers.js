/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { CrossClusterReplicationHome } from '../../../app/sections/home/home';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    initialEntries: [`/follower_indices`],
    componentRoutePath: `/:section`,
    onRouter: (router) => (routing.reactRouter = router),
  },
};

export const setup = registerTestBed(CrossClusterReplicationHome, testBedConfig);
