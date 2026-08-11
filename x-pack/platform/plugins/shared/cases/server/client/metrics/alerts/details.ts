/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { AttachmentType } from '../../../../common';
import { CASE_ATTACHMENT_SAVED_OBJECT } from '../../../../common/constants';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { SingleCaseMetricsResponse } from '../../../../common/types/api';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { Operations } from '../../../authorization';
import { getOwnersFilter } from '../../../authorization/utils';
import { createCaseError } from '../../../common/error';
import type { UnifiedAttachmentAttributes } from '../../../common/types/attachments_v2';

import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from '../types';
import { AlertHosts, AlertUsers } from './aggregations';
import type { EntityAssociatedNames, KnownAlertNames } from './entity_associated';
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
      services: { alertsService },
      logger,
    } = this.options.clientArgs;
    const { casesClient } = this.options;

    try {
      if (this.aggregationBuilders.length <= 0) {
        return {};
      }

      // Independent of each other until merged below, so fetch them concurrently.
      const [alerts, entityAttachments] = await Promise.all([
        casesClient.attachments.getAllDocumentsAttachedToCase({
          caseId: this.caseId,
          attachmentTypes: [AttachmentType.alert],
        }),
        this.getEntityAttachments(),
      ]);

      const entityNames = collectEntityAssociatedNames(entityAttachments);
      this.widenAggregationsForEntities(entityNames);

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

      return mergeAlertMetricsWithEntityNames(metrics, entityNames, knownAlertNames);
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts details attached case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }

  private async getEntityAttachments(): Promise<Array<SavedObject<UnifiedAttachmentAttributes>>> {
    const {
      authorization,
      services: { attachmentService },
    } = this.options.clientArgs;

    // Entity attachments only live on cases-attachments; getAttachmentAuthorizationFilter
    // ORs in cases-comments, which Saved Objects rejects for an attachments-only find.
    const { authorizedOwners } = await authorization.getAuthorizationFilter(
      Operations.getAttachmentMetrics
    );
    const authorizationFilter = authorizedOwners?.length
      ? getOwnersFilter(CASE_ATTACHMENT_SAVED_OBJECT, authorizedOwners)
      : undefined;

    return attachmentService.getter.getUnifiedAttachmentsByTypes({
      caseId: this.caseId,
      types: [SECURITY_ENTITY_ATTACHMENT_TYPE],
      filter: authorizationFilter,
    });
  }

  /**
   * Widens the underlying alert aggregations to capture every unique name (not just the
   * displayed top-N) so they can be exactly deduped against entity names — but only for the
   * entity kinds actually present, since widening is expensive (up to 100x the aggregation
   * buckets) and pointless when there's nothing of that kind to reconcile against.
   */
  private widenAggregationsForEntities(entityNames: EntityAssociatedNames): void {
    const widenUsers = entityNames.userNames.size > 0;
    const widenHosts = entityNames.hostsByName.size > 0;

    if (!widenUsers && !widenHosts) {
      return;
    }

    for (const builder of this.aggregationBuilders) {
      if (widenUsers && builder instanceof AlertUsers) {
        builder.widenToExhaustive();
      }
      if (widenHosts && builder instanceof AlertHosts) {
        builder.widenToExhaustive();
      }
    }
  }
}
