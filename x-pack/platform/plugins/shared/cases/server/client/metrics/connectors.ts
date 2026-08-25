/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleCaseMetricsResponse } from '../../../common/types/api';
import { CaseMetricsFeature } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { SingleCaseBaseHandler } from './single_case_base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';

export class Connectors extends SingleCaseBaseHandler {
  constructor(options: SingleCaseBaseHandlerCommonOptions) {
    super(options, [CaseMetricsFeature.CONNECTORS]);
  }

  public async compute(): Promise<SingleCaseMetricsResponse> {
    const {
      authorization,
      services: { userActionService },
      logger,
    } = this.options.clientArgs;

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getUserActionMetrics
    );

    const uniqueConnectors = await userActionService.getUniqueConnectors({
      caseId: this.caseId,
      filter: authorizationFilter,
    });

    try {
      return {
        connectors: { total: uniqueConnectors.length },
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve total connectors metrics for case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}
