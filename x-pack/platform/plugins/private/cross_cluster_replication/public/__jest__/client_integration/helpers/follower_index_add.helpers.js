/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithRouter } from './render';
import { FollowerIndexAdd } from '../../../app/sections/follower_index_add';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

/**
 * @param {object} [props]
 * @returns {ReturnType<typeof renderWithRouter>}
 */
export const setup = (props = {}) => {
  return renderWithRouter(FollowerIndexAdd, {
    store: createCrossClusterReplicationStore(),
    onRouter: (router) => {
      routing.reactRouter = {
        ...router,
        getUrlForApp: () => '',
      };
    },
    defaultProps: props,
  });
};
