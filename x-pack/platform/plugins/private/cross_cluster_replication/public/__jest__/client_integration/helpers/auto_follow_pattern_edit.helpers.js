/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithRouter } from './render';
import { AutoFollowPatternEdit } from '../../../app/sections/auto_follow_pattern_edit';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';
import { AUTO_FOLLOW_PATTERN_EDIT_NAME } from './constants';

/**
 * @param {object} [props]
 * @returns {ReturnType<typeof renderWithRouter>}
 */
export const setup = (props = {}) => {
  return renderWithRouter(AutoFollowPatternEdit, {
    store: createCrossClusterReplicationStore(),
    initialEntries: [`/${AUTO_FOLLOW_PATTERN_EDIT_NAME}`],
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
