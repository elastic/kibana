/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';

import { RulesClientContext } from '../../../../rules_client';
import { findGaps as _findGaps } from '../../../../lib/rule_gaps/find_gaps';
import { FindGapsParams } from '../../../../lib/rule_gaps/types';
import { getRule } from '../get/get_rule';
import { SanitizedRuleWithLegacyId } from '../../../../types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export async function findGaps(context: RulesClientContext, params: FindGapsParams) {
  try {
    const rule = (await getRule(context, {
      id: params.ruleId,
      includeLegacyId: true,
    })) as SanitizedRuleWithLegacyId;
    try {
      // Make sure user has access to this rule
      await context.authorization.ensureAuthorized({
        ruleTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        operation: ReadOperations.FindGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND_GAPS,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.name },
          error,
        })
      );
      throw error;
    }

    const eventLogClient = await context.getEventLogClient();
    const gaps = await _findGaps({
      params,
      eventLogClient,
      logger: context.logger,
    });

    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.FIND_GAPS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.name },
      })
    );

    return gaps;
  } catch (err) {
    const errorMessage = `Failed to find gaps`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
