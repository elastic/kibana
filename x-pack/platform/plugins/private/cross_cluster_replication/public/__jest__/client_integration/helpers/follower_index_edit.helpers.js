/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithRouter } from './render';
import { FollowerIndexEdit } from '../../../app/sections/follower_index_edit';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';
import { FOLLOWER_INDEX_EDIT_NAME } from './constants';

/**
 * @param {object} [props]
 * @returns {ReturnType<typeof renderWithRouter>}
 */
export const setup = (props = {}) => {
  return renderWithRouter(FollowerIndexEdit, {
    store: createCrossClusterReplicationStore(),
    initialEntries: [`/${FOLLOWER_INDEX_EDIT_NAME}`],
    routePath: '/:id',
    onRouter: (router) => {
      routing.reactRouter = {
        ...router,
        getUrlForApp: () => '',
      };
    },
    defaultProps: props,
  });
};
