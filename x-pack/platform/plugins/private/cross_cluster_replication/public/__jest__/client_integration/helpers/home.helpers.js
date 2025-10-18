/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithRouter } from './render';
import { CrossClusterReplicationHome } from '../../../app/sections/home';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

export const setup = (props = {}) => {
  return renderWithRouter(CrossClusterReplicationHome, {
    store: createCrossClusterReplicationStore(),
    initialEntries: ['/follower_indices'],
    routePath: '/:section',
    onRouter: (router) => {
      routing.reactRouter = router;
    },
    defaultProps: props,
  });
};
