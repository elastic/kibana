/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';
import { chunk, groupBy, mapValues, omit } from 'lodash';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { GetRulesParams } from './types';
import { getRulesParamsSchema } from './schemas';
import type { RuleParams } from '../../types';
import { bulkGetRulesSo } from '../../../../data/rule';
import { transformToSanitizedRule } from './utils';
import type { GetRulesResponse } from './types/get_rules_response';

export async function getRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: GetRulesParams
): Promise<GetRulesResponse<Params>> {
  try {
    getRulesParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating get rules params - ${error.message}`);
  }

  const result: GetRulesResponse<Params> = {
    rules: [],
    errors: [],
  };

  const savedObjects: Awaited<ReturnType<typeof bulkGetRulesSo>>['saved_objects'] = [];

  await pMap(
    chunk(params.ids, 100),
    async (ids) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { saved_objects } = await bulkGetRulesSo({
        savedObjectsClient: context.unsecuredSavedObjectsClient,
        ids,
      });
      saved_objects.forEach((so) => {
        if (so.error) {
          result.errors.push({ id: so.id, error: so.error });
          return;
        }
        savedObjects.push(so);
      });
    },
    {
      concurrency: 10,
    }
  );

  const alertTypes = mapValues(
    groupBy(savedObjects, (rule) => `${rule.attributes.alertTypeId}<>${rule.attributes.consumer}`),
    (groupedRules) => ({
      alertTypeId: groupedRules[0].attributes.alertTypeId,
      consumer: groupedRules[0].attributes.consumer,
      rules: groupedRules,
    })
  );

  const authorizedRuleSos: (typeof alertTypes)[0]['rules'] = [];
  for (const { alertTypeId, consumer, rules } of Object.values(alertTypes)) {
    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId: alertTypeId,
        consumer,
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Rule,
      });

      authorizedRuleSos.push(...rules);
    } catch (error) {
      rules.forEach((rule) => {
        result.errors.push({
          id: rule.id,
          error,
        });
      });
    }
  }

  authorizedRuleSos.forEach((rule) => {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.attributes.name },
      })
    );
  });

  result.errors.forEach(({ error, id }) => {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error: new Error(error.message),
      })
    );
  });

  const paramsForTransform = omit(params, ['ids']);
  const transformedRules = await pMap(
    authorizedRuleSos,
    (rule) => transformToSanitizedRule<Params>(context, rule, paramsForTransform),
    { concurrency: 10 }
  );
  result.rules.push(...transformedRules);
  return result;
}
