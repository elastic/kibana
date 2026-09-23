/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Impact } from '../../../common/impact/impact';
import type { ImpactPrivilegesChecker } from './check_impact_privileges';
import type { ImpactService } from './impact_service';

/**
 * In-process impact reads. The space and the principal both come from the
 * request, so a caller cannot supply another space or skip `read_impact`.
 */
export interface ImpactReadClient {
  listByConversationIds: (conversationIds: string[]) => Promise<Impact[]>;
}

export interface ImpactClientDeps {
  getImpactService: () => ImpactService;
  getSpaceId: (request: KibanaRequest) => string;
  privileges: ImpactPrivilegesChecker;
}

/** Builds a request-scoped reader. The privilege check runs before any search. */
export const createImpactClient =
  ({ getImpactService, getSpaceId, privileges }: ImpactClientDeps) =>
  (request: KibanaRequest): ImpactReadClient => ({
    listByConversationIds: async (conversationIds) => {
      await privileges.assertCanRead(request);
      return getImpactService().listByConversationIds(conversationIds, getSpaceId(request));
    },
  });
