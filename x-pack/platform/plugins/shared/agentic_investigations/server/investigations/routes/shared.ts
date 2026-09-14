/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { Investigation, InvestigationPatch } from '../../../common/investigations/investigation';
import { INVESTIGATION_ROUTE_BASE } from '../../../common/investigations/constants';
import type { ListInvestigationsQuery } from '../services/investigations_service';

export const INTERNAL_ACCESS = 'internal' as const;

export const INVESTIGATIONS_INTERNAL_URL = INVESTIGATION_ROUTE_BASE;
export const INVESTIGATIONS_BY_ID_URL = `${INVESTIGATION_ROUTE_BASE}/{id}` as const;

/**
 * Route privileges follow the platform `<operation>_<subject>` convention. They
 * live server-side because `ApiPrivileges` ships from a server package, and the
 * browser never needs them.
 */
export const INVESTIGATIONS_READ_PRIVILEGE = ApiPrivileges.read('investigations');
export const INVESTIGATIONS_MANAGE_PRIVILEGE = ApiPrivileges.manage('investigations');

export const investigationIdParamsSchema = z.object({
  id: z.string().min(1).max(256),
});

/**
 * Minimal surface the routes require from the investigations service. The
 * concrete `InvestigationsService` class satisfies this structurally;
 * keeping it local avoids an unresolvable import while the service leaf is
 * assembled in a parallel build step.
 */
export interface InvestigationsServiceContract {
  upsert: (spaceId: string, doc: Omit<Investigation, 'id'>) => Promise<Investigation>;
  patch: (id: string, spaceId: string, patch: InvestigationPatch) => Promise<Investigation>;
  list: (
    spaceId: string,
    query: ListInvestigationsQuery
  ) => Promise<{ items: Investigation[]; total: number; severityCounts: Record<string, number> }>;
  get: (spaceId: string, id: string) => Promise<Investigation | null>;
}

export interface InvestigationsRouteDependencies {
  router: IRouter;
  logger: Logger;
  getInvestigationsService: () => InvestigationsServiceContract;
  getSpaceId: (request: KibanaRequest) => string;
}
