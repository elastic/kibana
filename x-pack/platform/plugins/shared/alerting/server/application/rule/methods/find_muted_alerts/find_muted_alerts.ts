/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { combineFilterWithAuthorizationFilter } from '../../../../rules_client/common/filters';
import { AlertingAuthorizationEntity, ReadOperations } from '../../../../authorization/types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { buildKueryNodeFilter } from '../../../../rules_client/common';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { FindMutedAlertsParams } from './types';
import { findMutedAlertsParamsSchema } from './schemas';
import { findRulesSo } from '../../../../data/rule';

export interface FindMutedAlertsResult {
  page: number;
  perPage: number;
  total: number;
  data: Array<{ id: string; mutedInstanceIds: string[] }>;
}

export async function findMutedAlerts(
  context: RulesClientContext,
  params?: FindMutedAlertsParams
): Promise<FindMutedAlertsResult> {
  const { options } = params || {};

  const restOptions = options || {};

  try {
    if (params) {
      findMutedAlertsParamsSchema.validate(params);
    }
  } catch (error) {
    throw Boom.badRequest(`Error validating find muted alerts data - ${error.message}`);
  }

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getAuthorizationFilter({
      operation: ReadOperations.FindMutedAlerts,
      authorizationEntity: AlertingAuthorizationEntity.Rule,
      filterOpts: alertingAuthorizationFilterOpts,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND_MUTED_ALERTS,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter, ensureRuleTypeIsAuthorized } = authorizationTuple;
  const filterKueryNode = buildKueryNodeFilter(restOptions.filter as string | KueryNode);

  const finalFilter = combineFilterWithAuthorizationFilter(
    filterKueryNode ?? undefined,
    authorizationFilter as KueryNode
  );

  const {
    page,
    per_page: perPage,
    total,
    saved_objects: data,
  } = await findRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      ...restOptions,
      filter: finalFilter,
      fields: ['alertTypeId', 'consumer', 'name', 'mutedInstanceIds'],
    },
  });

  const authorizedData = data.map(({ id, attributes }) => {
    try {
      ensureRuleTypeIsAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        AlertingAuthorizationEntity.Rule
      );
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND_MUTED_ALERTS,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
          error,
        })
      );
      throw error;
    }

    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND_MUTED_ALERTS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
      })
    );

    return { id, mutedInstanceIds: attributes.mutedInstanceIds ?? [] };
  });

  return {
    page,
    perPage,
    total,
    data: authorizedData,
  };
}
