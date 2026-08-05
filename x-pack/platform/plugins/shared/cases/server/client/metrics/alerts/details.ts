/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common';
import { CASE_ATTACHMENT_SAVED_OBJECT } from '../../../../common/constants';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { SingleCaseMetricsResponse } from '../../../../common/types/api';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { Operations } from '../../../authorization';
import { getOwnersFilter } from '../../../authorization/utils';
import { createCaseError } from '../../../common/error';

import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from '../types';
import { AlertHosts, AlertUsers } from './aggregations';
import type { KnownAlertNames } from './entity_associated';
import {
  collectEntityAssociatedNames,
  mergeAlertMetricsWithEntityNames,
} from './entity_associated';

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
      authorization,
      services: { alertsService, attachmentService },
      logger,
    } = this.options.clientArgs;
    const { casesClient } = this.options;

    try {
      if (this.aggregationBuilders.length <= 0) {
        return {};
      }

      const alerts = await casesClient.attachments.getAllDocumentsAttachedToCase({
        caseId: this.caseId,
        attachmentTypes: [AttachmentType.alert],
      });

      let metrics: SingleCaseMetricsResponse =
        this.formatResponse<SingleCaseMetricsResponse>(undefined);
      let knownAlertNames: KnownAlertNames = { userNames: new Set(), hostNames: new Set() };

      if (alerts.length > 0) {
        const aggregationsResponse = await alertsService.executeAggregations({
          aggregationBuilders: this.aggregationBuilders,
          alerts,
        });
        metrics = this.formatResponse<SingleCaseMetricsResponse>(aggregationsResponse);
        knownAlertNames = {
          userNames: new Set(AlertUsers.getAllNames(aggregationsResponse)),
          hostNames: new Set(AlertHosts.getAllNames(aggregationsResponse)),
        };
      }

      // Entity attachments only live on cases-attachments. Use an owners filter for that
      // SO type alone — getAttachmentAuthorizationFilter ORs in cases-comments, which
      // Saved Objects rejects when the find `type` list is attachments-only.
      const { authorizedOwners } = await authorization.getAuthorizationFilter(
        Operations.getAttachmentMetrics
      );
      const authorizationFilter = authorizedOwners?.length
        ? getOwnersFilter(CASE_ATTACHMENT_SAVED_OBJECT, authorizedOwners)
        : undefined;

      const entityAttachments = await attachmentService.getter.getUnifiedAttachmentsByTypes({
        caseId: this.caseId,
        types: [SECURITY_ENTITY_ATTACHMENT_TYPE],
        filter: authorizationFilter,
      });

      return mergeAlertMetricsWithEntityNames(
        metrics,
        collectEntityAssociatedNames(entityAttachments),
        knownAlertNames
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}
