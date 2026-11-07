/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { AssignmentsService } from '../assignments/assignments_service';
import type { InvestigationStatusService } from './services/investigation_status_service';
import type { InvestigationsQueryService } from './services/investigations_query_service';
import type { InvestigationsPrivilegesReader } from './services/check_investigations_privileges';

export interface InvestigationRouteDependencies {
  router: IRouter;
  logger: Logger;
  getAssignmentsService: () => AssignmentsService;
  getInvestigationStatusService?: () => InvestigationStatusService;
  /** Runs after a user closes an investigation through the status route; failures are logged. */
  onInvestigationClosed?: (request: KibanaRequest, investigationId: string) => Promise<void>;
  getInvestigationsQueryService: () => InvestigationsQueryService;
  privileges: InvestigationsPrivilegesReader;
}
