/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LICENSE_TOO_LOW = i18n.translate(
  'xpack.osquery.liveQueryActions.error.licenseTooLow',
  {
    defaultMessage: 'At least Platinum license is required to use Response Actions.',
  }
);

export const PARAMETER_NOT_FOUND = i18n.translate(
  'xpack.osquery.liveQueryActions.error.notFoundParameters',
  {
    defaultMessage:
      "This query hasn't been called due to parameter used and its value not found in the alert.",
  }
);

export const TOO_MANY_AGENT_IDS = i18n.translate(
  'xpack.osquery.actionResults.error.tooManyAgentIds',
  {
    defaultMessage:
      'Too many agent IDs in URL (max 100). Either reduce the list or omit agentIds to query all agents from the action.',
  }
);
