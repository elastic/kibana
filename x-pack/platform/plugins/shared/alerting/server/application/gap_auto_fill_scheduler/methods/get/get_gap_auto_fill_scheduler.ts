/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapAutoFillSchedulerParams } from '../types';
import type { GapAutoFillSchedulerResponse } from '../../result/types';
import { getGapAutoFillSchedulerSchema } from '../schemas';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';
import { ReadOperations } from '../../../../authorization';
import {
  gapAutoFillSchedulerAuditEvent,
  GapAutoFillSchedulerAuditAction,
} from '../../../../rules_client/common/audit_events';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getGapAutoFillSchedulerSO } from '../utils';

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
    const result = await getGapAutoFillSchedulerSO({
      context,
      id: params.id,
      operation: ReadOperations.GetGapAutoFillScheduler,
      authAuditAction: GapAutoFillSchedulerAuditAction.GET,
    });

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
