/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleCaseMetricsResponse } from '../../../../common/types/api';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';

import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from '../types';
import { AlertHosts, AlertUsers } from './aggregations';

export class AlertDetails extends SingleCaseAggregationHandler {
  constructor(options: SingleCaseBaseHandlerCommonOptions) {
    super(
      options,
      new Map<string, AggregationBuilder<SingleCaseMetricsResponse>>([
        [CaseMetricsFeature.ALERTS_HOSTS, new AlertHosts()],
        [CaseMetricsFeature.ALERTS_USERS, new AlertUsers()],
      ])
    );
  }

  public async compute(): Promise<SingleCaseMetricsResponse> {
    const {
      services: { alertsService },
      logger,
    } = this.options.clientArgs;
    const { casesClient } = this.options;

    try {
      const alerts = await casesClient.attachments.getAllAlertsAttachToCase({
        caseId: this.caseId,
      });

      if (alerts.length <= 0 || this.aggregationBuilders.length <= 0) {
        return this.formatResponse();
      }

      const aggregationsResponse = await alertsService.executeAggregations({
        aggregationBuilders: this.aggregationBuilders,
        alerts,
      });

      return this.formatResponse<SingleCaseMetricsResponse>(aggregationsResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}
