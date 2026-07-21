/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getAlertEventNotFoundMessage,
  getCannotActivateEpisodeMessage,
} from '../../lib/errors/alert_error_messages';
import {
  bulkCreateAlertActionOasExamples,
  createAckAlertActionOasExamples,
} from './alert_oas_examples';
import { CreateAckAlertActionRoute } from './create_ack_alert_action_route';

describe('alert OAS examples', () => {
  it('includes request and route-error examples for ack', () => {
    const oas = createAckAlertActionOasExamples();

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createAckAlertActionRequest
    ).toBeDefined();
    expect(
      oas.responses?.[400]?.content?.['application/json']?.examples?.invalidAlertAction
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
          message: getCannotActivateEpisodeMessage('episode-1'),
        }),
      })
    );
    expect(
      oas.responses?.[404]?.content?.['application/json']?.examples?.alertEventNotFound
    ).toEqual(
      expect.objectContaining({
        value: expect.objectContaining({
          code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
          message: getAlertEventNotFoundMessage('group-hash-1', 'episode-1'),
        }),
      })
    );
  });

  it('includes request and success examples for bulk create', () => {
    const oas = bulkCreateAlertActionOasExamples();

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
  });

  it('is exposed on CreateAckAlertActionRoute.options', async () => {
    expect(CreateAckAlertActionRoute.options.oasOperationObject).toBe(
      createAckAlertActionOasExamples
    );

    const oas = await CreateAckAlertActionRoute.options.oasOperationObject!();
    expect(typeof oas).not.toBe('string');
    if (typeof oas === 'string') {
      throw new Error('expected object OAS fragment');
    }

    expect(
      oas.requestBody?.content?.['application/json']?.examples?.createAckAlertActionRequest
    ).toBeDefined();
    expect(
      oas.responses?.[404]?.content?.['application/json']?.examples?.alertEventNotFound
    ).toBeDefined();
  });
});
