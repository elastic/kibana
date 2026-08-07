/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { getAlertEventNotFoundMessage } from '../../lib/errors/alert_error_messages';
import { invalidResponseExample } from '../oas_utils';
import type { OasExampleEntry } from '../oas_types';

export const SAMPLE_GROUP_HASH = 'group-hash-1';
export const SAMPLE_EPISODE_ID = 'episode-1';

/** Shared 400 body for typed alert-action routes (missing path params). */
export const INVALID_ALERT_ACTION_PARAMS_RESPONSE = invalidResponseExample({
  summary: 'Path is missing required group_hash',
  message: 'group_hash: Required',
  details: { errors: { group_hash: ['Required'] } },
});

/** Shared 404 body for typed alert-action routes. */
export const ALERT_EVENT_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'alertEventNotFound',
  summary: 'No alert event exists for the given group_hash and episode_id',
  value: {
    code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
    error: 'Not Found',
    message: getAlertEventNotFoundMessage(SAMPLE_GROUP_HASH, SAMPLE_EPISODE_ID),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
      episode_id: SAMPLE_EPISODE_ID,
    },
  } satisfies ErrorResponse,
};
