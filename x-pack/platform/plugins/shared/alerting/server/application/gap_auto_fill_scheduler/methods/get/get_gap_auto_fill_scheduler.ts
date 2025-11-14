/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapAutoFillSchedulerParams } from './types';
import type { GapAutoFillSchedulerResponse } from '../../result/types';
import { getGapAutoFillSchedulerSchema } from './schemas';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

export async function getGapAutoFillScheduler(
  context: RulesClientContext,
  params: GetGapAutoFillSchedulerParams
): Promise<GapAutoFillSchedulerResponse> {
  try {
    getGapAutoFillSchedulerSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler get parameters "${JSON.stringify(params)}" - ${
        error.message
      }`
    );
  }

  try {
    const result = await context.unsecuredSavedObjectsClient.get<GapAutoFillSchedulerSO>(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    if (result.error) {
      const err = new Error(result.error.message);
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: result.attributes.name,
          },
          error: new Error(result.error.message),
        })
      );
      throw err;
    }

    // Authorization check - we need to check if user has permission to get
    // For gap fill auto scheduler, we check against the rule types it manages
    const ruleTypes = result.attributes.ruleTypes || [];

    try {
      for (const ruleType of ruleTypes) {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType.type,
          consumer: ruleType.consumer,
          operation: ReadOperations.GetGapAutoFillScheduler,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (error) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: result.attributes.name,
          },
          error,
        })
      );
      throw error;
    }

    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET,
        savedObject: {
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: result.attributes.name,
        },
      })
    );

    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: result,
    });
  } catch (err) {
    const errorMessage = `Failed to get gap fill auto scheduler by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
