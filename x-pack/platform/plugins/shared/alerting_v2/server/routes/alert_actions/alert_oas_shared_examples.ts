/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getAlertAlreadyAcknowledgedMessage,
  getAlertEpisodeNotFoundMessage,
  getAlertNotAcknowledgedMessage,
  getAlertSeriesNotFoundMessage,
  getAssigneeUnchangedMessage,
  getEpisodeNotLatestMessage,
  getTagsUnchangedMessage,
} from '../../lib/errors/alert_error_messages';
import { invalidResponseExample } from '../oas_utils';
import type { OasExampleEntry } from '../oas_types';

export const SAMPLE_GROUP_HASH = '98058cb569017ecb6b08b554ecbcb2524ff7dd8971828f4f2e5939c1e6667e56';
export const SAMPLE_OTHER_GROUP_HASH =
  '62b86eca4670c2a0a01fa8bb5570c5c2dfa7d20a9d9def5b6acfdef4d98d307a';
export const SAMPLE_EPISODE_ID = 'alert-1';

/** Shared 400 body for series-level alert-action routes (missing path params). */
export const INVALID_SERIES_ACTION_PARAMS_RESPONSE = invalidResponseExample({
  summary: 'Path is missing required group_hash.',
  message: 'group_hash: Required',
  details: { errors: { group_hash: ['Required'] } },
});

/** Shared 400 body for episode-level alert-action routes (missing path params). */
export const INVALID_EPISODE_ACTION_PARAMS_RESPONSE = invalidResponseExample({
  summary: 'Path is missing required id',
  message: 'id: Required',
  details: { errors: { id: ['Required'] } },
});

/** Shared 404 body for series-level alert-action routes. */
export const ALERT_SERIES_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'alertSeriesNotFound',
  summary: 'No alert episode series exists for the given group_hash',
  value: {
    code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
    error: 'Not Found',
    message: getAlertSeriesNotFoundMessage(SAMPLE_GROUP_HASH),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
    },
  } satisfies ErrorResponse,
};

/** Shared 404 body for episode-level alert-action routes. */
export const ALERT_EPISODE_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'alertNotFound',
  summary: 'No alert exists for the given alert_id',
  value: {
    code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
    error: 'Not Found',
    message: getAlertEpisodeNotFoundMessage(SAMPLE_EPISODE_ID),
    details: {
      alert_id: SAMPLE_EPISODE_ID,
    },
  } satisfies ErrorResponse,
};

export const SAMPLE_ASSIGNEE_UID = 'u_abc123';

/** Shared 409 body for `_ack` on an alert that is already acknowledged. */
export const ALERT_ALREADY_ACKNOWLEDGED_RESPONSE: OasExampleEntry = {
  name: 'alertAlreadyAcknowledged',
  summary: 'The alert is already acknowledged, so the request would change nothing',
  value: {
    code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
    error: 'Conflict',
    message: getAlertAlreadyAcknowledgedMessage(SAMPLE_EPISODE_ID),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
      alert_id: SAMPLE_EPISODE_ID,
      action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
    },
  } satisfies ErrorResponse,
};

/** Shared 409 body for `_unack` on an alert that is not acknowledged. */
export const ALERT_NOT_ACKNOWLEDGED_RESPONSE: OasExampleEntry = {
  name: 'alertNotAcknowledged',
  summary: 'The alert is not acknowledged, so the request would change nothing',
  value: {
    code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
    error: 'Conflict',
    message: getAlertNotAcknowledgedMessage(SAMPLE_EPISODE_ID),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
      alert_id: SAMPLE_EPISODE_ID,
      action_type: ALERT_EPISODE_ACTION_TYPE.UNACK,
    },
  } satisfies ErrorResponse,
};

/** Shared 409 body for `_assign` with the assignee the alert already carries. */
export const ALERT_ASSIGNEE_UNCHANGED_RESPONSE: OasExampleEntry = {
  name: 'alertAssigneeUnchanged',
  summary: 'The alert is already assigned to the requested user',
  value: {
    code: ALERTING_ERROR_CODES.ALERT_ACTION_NO_OP,
    error: 'Conflict',
    message: getAssigneeUnchangedMessage(SAMPLE_EPISODE_ID, SAMPLE_ASSIGNEE_UID),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
      alert_id: SAMPLE_EPISODE_ID,
      action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
    },
  } satisfies ErrorResponse,
};

/** Shared 409 body for `_tag` with the set the alert already carries. */
export const ALERT_TAGS_UNCHANGED_RESPONSE: OasExampleEntry = {
  name: 'alertTagsUnchanged',
  summary: 'The alert already carries exactly the requested tags',
  value: {
    code: ALERTING_ERROR_CODES.ALERT_ACTION_NO_OP,
    error: 'Conflict',
    message: getTagsUnchangedMessage(SAMPLE_EPISODE_ID),
    details: {
      group_hash: SAMPLE_GROUP_HASH,
      alert_id: SAMPLE_EPISODE_ID,
      action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
    },
  } satisfies ErrorResponse,
};

/** Shared 409 body for the lifecycle episode actions, which require the latest episode. */
export const ALERT_EPISODE_NOT_LATEST_RESPONSE: OasExampleEntry = {
  name: 'alertNotLatest',
  summary: 'The alert has been superseded by a newer alert of its series',
  value: {
    code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_LATEST,
    error: 'Conflict',
    message: getEpisodeNotLatestMessage(SAMPLE_EPISODE_ID, SAMPLE_GROUP_HASH),
    details: {
      alert_id: SAMPLE_EPISODE_ID,
      group_hash: SAMPLE_GROUP_HASH,
    },
  } satisfies ErrorResponse,
};
