/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkCreateAlertActionBodySchema,
  createAlertActionParamsSchema,
} from '@kbn/alerting-v2-schemas';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getAlertEventNotFoundMessage,
  getCannotActivateEpisodeMessage,
  getCannotDeactivateEpisodeMessage,
} from '../../lib/errors/alert_error_messages';
import type { AlertingV2OasOperationObject } from '../json_oas_example';
import {
  ALERT_EVENT_NOT_FOUND_DESCRIPTION,
  INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
} from '../route_response_descriptions';
import {
  CREATE_ACK_ALERT_ACTION_SUMMARY,
  bulkCreateAlertActionOasExamples,
  createAckAlertActionOasExamples,
  createActivateAlertActionOasExamples,
  createDeactivateAlertActionOasExamples,
} from './alert_oas_examples';
import { CreateAckAlertActionRoute } from './create_ack_alert_action_route';

describe('alert OAS examples', () => {
  it('includes request and schema-validation 400 for ack (not activate-specific)', () => {
    const oas = createAckAlertActionOasExamples();
    const invalidParamsParse = createAlertActionParamsSchema.safeParse({});
    expect(invalidParamsParse.success).toBe(false);
    if (invalidParamsParse.success) {
      throw new Error('expected invalid params parse to fail');
    }

    expect(CreateAckAlertActionRoute.options?.summary).toBe(CREATE_ACK_ALERT_ACTION_SUMMARY);
    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createAckAlertActionRequest
    ).toEqual(expect.objectContaining({ summary: CREATE_ACK_ALERT_ACTION_SUMMARY }));
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidAlertActionRequest
    ).toEqual(
      expect.objectContaining({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        value: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: stringifyZodError(invalidParamsParse.error),
        }),
      })
    );
    expect(
      oas.responses?.[404]?.content?.['application/json']?.examples?.alertEventNotFound
    ).toEqual(
      expect.objectContaining({
        summary: ALERT_EVENT_NOT_FOUND_DESCRIPTION,
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
          message: getAlertEventNotFoundMessage('group-hash-1', 'episode-1'),
        }),
      })
    );
  });

  it('includes INVALID_EPISODE_STATE_TRANSITION 400 for activate', () => {
    const oas = createActivateAlertActionOasExamples();

    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidEpisodeStateTransition
    ).toEqual(
      expect.objectContaining({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
          message: getCannotActivateEpisodeMessage('episode-1'),
          details: expect.objectContaining({ action_type: 'activate' }),
        }),
      })
    );
  });

  it('includes INVALID_EPISODE_STATE_TRANSITION 400 for deactivate', () => {
    const oas = createDeactivateAlertActionOasExamples();

    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidEpisodeStateTransition
    ).toEqual(
      expect.objectContaining({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
          message: getCannotDeactivateEpisodeMessage('episode-1'),
          details: expect.objectContaining({ action_type: 'deactivate' }),
        }),
      })
    );
  });

  it('includes request, success, and schema-validation 400 for bulk create', () => {
    const oas = bulkCreateAlertActionOasExamples();
    const invalidBulkBodyParse = bulkCreateAlertActionBodySchema.safeParse([]);
    expect(invalidBulkBodyParse.success).toBe(false);
    if (invalidBulkBodyParse.success) {
      throw new Error('expected invalid bulk body parse to fail');
    }

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.bulkCreateAlertActionRequest
    ).toBeDefined();
    expect(
      oas.responses?.[200]?.content?.['application/json']?.examples?.bulkCreateAlertActionResponse
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          processed: 2,
          total: 2,
        }),
      })
    );
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples
        ?.invalidBulkCreateAlertActionRequest
    ).toEqual(
      expect.objectContaining({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        value: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: stringifyZodError(invalidBulkBodyParse.error),
        }),
      })
    );
  });

  it('is exposed on CreateAckAlertActionRoute.options', async () => {
    expect(CreateAckAlertActionRoute.options?.oasOperationObject).toBe(
      createAckAlertActionOasExamples
    );

    const oasOperationObject = CreateAckAlertActionRoute.options?.oasOperationObject;
    expect(oasOperationObject).toBeDefined();
    if (!oasOperationObject) {
      throw new Error('expected oasOperationObject');
    }

    const oas = (await oasOperationObject()) as AlertingV2OasOperationObject;
    expect(typeof oas).not.toBe('string');

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createAckAlertActionRequest
    ).toBeDefined();
    expect(
      oas.responses?.[404]?.content?.['application/json']?.examples?.alertEventNotFound
    ).toBeDefined();
  });
});
