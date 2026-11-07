/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ActionSource } from '../../../../../common/types/domain';
import type { CasesClient } from '../../../../client';
import type { ConfigType } from '../../../../config';
import { getRelatedCasesRoute, linkCasesRoute, unlinkCaseRoute } from './case_links';
import { createPostFromRoomRoute, ensureCaseRoomRoute } from './room';

/** Routes for cases that work with agents and AlertZero (`xpack.cases.agentic.enabled`). */
export const getAgenticCaseRoutes = (
  config: ConfigType,
  getCasesClientAs?: (request: KibanaRequest, actionSource: ActionSource) => Promise<CasesClient>
) => {
  if (!config.agentic.enabled) return [];
  return [
    getRelatedCasesRoute,
    linkCasesRoute,
    unlinkCaseRoute,
    ...(config.chat.enabled && getCasesClientAs
      ? [ensureCaseRoomRoute, createPostFromRoomRoute(getCasesClientAs)]
      : []),
  ];
};
