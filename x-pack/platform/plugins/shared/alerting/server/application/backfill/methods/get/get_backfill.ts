/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { RulesClientContext } from '../../../../rules_client';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  AdHocRunAuditAction,
  adHocRunAuditEvent,
} from '../../../../rules_client/common/audit_events';
import { Backfill } from '../../result/types';
import { transformAdHocRunToBackfillResult } from '../../transforms';

export async function getBackfill(context: RulesClientContext, id: string): Promise<Backfill> {
  try {
    const result = await context.unsecuredSavedObjectsClient.get<AdHocRunSO>(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      id
    );

    // Check for errors in the savedObjectClient result
    if (result.error) {
      const err = new Error(result.error.message);
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.GET,
          savedObject: {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id,
            name: `backfill for rule "${result.attributes.rule.name}"`,
          },
          error: new Error(result.error.message),
        })
      );
      throw err;
    }

    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId: result.attributes.rule.alertTypeId,
        consumer: result.attributes.rule.consumer,
        operation: ReadOperations.GetBackfill,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      context.auditLogger?.log(
        adHocRunAuditEvent({
          action: AdHocRunAuditAction.GET,
          savedObject: {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id,
            name: `backfill for rule "${result.attributes.rule.name}"`,
          },
          error,
        })
      );
      throw error;
    }
    context.auditLogger?.log(
      adHocRunAuditEvent({
        action: AdHocRunAuditAction.GET,
        savedObject: {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id,
          name: `backfill for rule "${result.attributes.rule.name}"`,
        },
      })
    );

    return transformAdHocRunToBackfillResult(result) as Backfill;
  } catch (err) {
    const errorMessage = `Failed to get backfill by id: ${id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
