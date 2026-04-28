/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import { renderWithRouter, type CcrRenderResult, type OnRouterPayload } from './render';
import { AutoFollowPatternAdd } from '../../../app/sections/auto_follow_pattern_add';
import { createCrossClusterReplicationStore } from '../../../app/store';
import { routing, type CcrReactRouter } from '../../../app/services/routing';

export const setup = (
  componentProps: Partial<ComponentProps<typeof AutoFollowPatternAdd>> = {}
): CcrRenderResult => {
  return renderWithRouter(AutoFollowPatternAdd, {
    store: createCrossClusterReplicationStore(),
    onRouter: (router: OnRouterPayload) => {
      const ccrRouter: CcrReactRouter = {
        ...router,
        getUrlForApp: () => '',
      };
      routing.reactRouter = ccrRouter;
    },
    componentProps,
  });
};
