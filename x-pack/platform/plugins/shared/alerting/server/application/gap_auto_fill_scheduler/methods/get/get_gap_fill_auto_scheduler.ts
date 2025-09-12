/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapFillAutoSchedulerParams } from './types';
import type { GapFillAutoSchedulerResponse } from '../../result/types';
import { getGapFillAutoSchedulerSchema } from './schemas';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import type { GapAutoFillSchedulerSavedObjectAttributes } from '../../transforms';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';

export async function getGapFillAutoScheduler(
  context: RulesClientContext,
  params: GetGapFillAutoSchedulerParams
): Promise<GapFillAutoSchedulerResponse> {
  try {
    // Validate input parameters
    getGapFillAutoSchedulerSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Error validating gap auto fill scheduler get parameters "${JSON.stringify(params)}" - ${error.message}`
    );
  }

  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');

  try {
    const result = await context.unsecuredSavedObjectsClient.get<GapAutoFillSchedulerSavedObjectAttributes>(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    // Check for errors in the savedObjectClient result
    if (result.error) {
      const err = new Error(result.error.message);
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
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
          operation: ReadOperations.GetGapFillAutoScheduler,
          entity: AlertingAuthorizationEntity.Rule,
        });
      }
    } catch (error) {
      context.auditLogger?.log(
        gapAutoFillSchedulerAuditEvent({
          action: GapAutoFillSchedulerAuditAction.GET,
          savedObject: {
            type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: result.attributes.name,
          },
          error,
        })
      );
      throw error;
    }

    // Log successful get
    context.auditLogger?.log(
      gapAutoFillSchedulerAuditEvent({
        action: GapAutoFillSchedulerAuditAction.GET,
        savedObject: {
          type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
          id: params.id,
          name: result.attributes.name,
        },
      })
    );

    // Transform SavedObject to response format using the transform function
    return transformSavedObjectToGapAutoFillSchedulerResult({
      savedObject: result as SavedObject<GapAutoFillSchedulerSavedObjectAttributes>,
    });
  } catch (err) {
    const errorMessage = `Failed to get gap fill auto scheduler by id: ${params.id}`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
