/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsFindResult } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { findRulesSo } from '../../../../data/rule';
import {
  alertingAuthorizationFilterOpts,
  RULE_TYPE_CHECKS_CONCURRENCY,
} from '../../../../rules_client/common/constants';
import { convertRuleIdsToKueryNode } from '../../../../lib';
import { RuleBulkOperationAggregation, RulesClientContext } from '../../../../rules_client';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type {
  ScheduleBackfillParam,
  ScheduleBackfillParams,
  ScheduleBackfillResults,
} from './types';
import { scheduleBackfillParamsSchema } from './schemas';
import { transformRuleAttributesToRuleDomain } from '../../../rule/transforms';
import { RawRule } from '../../../../types';

export async function scheduleBackfill(
  context: RulesClientContext,
  params: ScheduleBackfillParams
): Promise<ScheduleBackfillResults> {
  try {
    scheduleBackfillParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating backfill schedule parameters "${JSON.stringify(params)}" - ${error.message}`
    );
  }

  // Get rule SO IDs
  const ruleIds = params.map((param: ScheduleBackfillParam) => param.ruleId);
  const kueryNodeFilter = convertRuleIdsToKueryNode(ruleIds);

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter({
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      filterOpts: alertingAuthorizationFilterOpts,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SCHEDULE_BACKFILL,
        error,
      })
    );
    throw error;
  }
  const { filter: authorizationFilter } = authorizationTuple;
  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { aggregations } = await findRulesSo<RuleBulkOperationAggregation>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      filter: kueryNodeFilterWithAuth,
      page: 1,
      perPage: 0,
      ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
    },
  });

  const buckets = aggregations?.alertTypeId?.buckets;
  if (buckets === undefined || !buckets.length) {
    throw Boom.badRequest(`No rules matching ids ${ruleIds} found to schedule backfill`);
  }

  await pMap(
    buckets,
    async ({ key: [ruleType, consumer] }) => {
      context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);

      try {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType,
          consumer,
          operation: WriteOperations.ScheduleBackfill,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (error) {
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.SCHEDULE_BACKFILL,
            error,
          })
        );
        throw error;
      }
    },
    { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
  );

  const rulesFinder =
    await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
      {
        filter: kueryNodeFilterWithAuth,
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  let rulesToSchedule: Array<SavedObjectsFindResult<RawRule>> = [];
  for await (const response of rulesFinder.find()) {
    for (const rule of response.saved_objects) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.SCHEDULE_BACKFILL,
          savedObject: {
            type: RULE_SAVED_OBJECT_TYPE,
            id: rule.id,
            name: rule.attributes.name,
          },
        })
      );
    }

    rulesToSchedule = [...response.saved_objects];
  }

  const actionsClient = await context.getActionsClient();
  return await context.backfillClient.bulkQueue({
    actionsClient,
    auditLogger: context.auditLogger,
    params,
    rules: rulesToSchedule.map(({ id, attributes, references }) => {
      const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
      return transformRuleAttributesToRuleDomain(
        attributes,
        {
          id,
          logger: context.logger,
          ruleType,
          references,
          omitGeneratedValues: false,
        },
        (connectorId: string) => actionsClient.isSystemAction(connectorId)
      );
    }),
    ruleTypeRegistry: context.ruleTypeRegistry,
    spaceId: context.spaceId,
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    eventLogClient: await context.getEventLogClient(),
    internalSavedObjectsRepository: context.internalSavedObjectsRepository,
    eventLogger: context.eventLogger,
  });
}
