/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.workday.selectMessageText',
  {
    defaultMessage: 'Look up worker data from Workday',
  }
);

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.config.apiUrlLabel',
  {
    defaultMessage: 'Workday REST API base URL',
  }
);

export const API_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.workday.config.apiUrlHelp',
  {
    defaultMessage:
      'Fully-qualified base URL including tenant, e.g. https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant',
  }
);

export const TOKEN_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.config.tokenUrlLabel',
  {
    defaultMessage: 'OAuth2 token URL',
  }
);

export const TOKEN_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.workday.config.tokenUrlHelp',
  {
    defaultMessage:
      'Workday OAuth2 token endpoint, e.g. https://wd2-impl-services1.workday.com/ccx/oauth2/mytenant/token',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.config.clientIdLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.config.clientSecretLabel',
  {
    defaultMessage: 'Client secret',
  }
);

export const ACTION_TYPE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.actionTypeLabel',
  {
    defaultMessage: 'Action',
  }
);

export const GET_WORKER_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.getWorkerLabel',
  {
    defaultMessage: 'Get worker by ID',
  }
);

export const SEARCH_WORKERS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.searchWorkersLabel',
  {
    defaultMessage: 'Search workers',
  }
);

export const WORKER_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.workerIdLabel',
  {
    defaultMessage: 'Worker ID',
  }
);

export const SEARCH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.searchLabel',
  {
    defaultMessage: 'Search query',
  }
);

export const SEARCH_HELP = i18n.translate(
  'xpack.stackConnectors.components.workday.params.searchHelp',
  {
    defaultMessage: 'Matches on name; must be at least 3 characters.',
  }
);

export const LIMIT_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.limitLabel',
  {
    defaultMessage: 'Limit',
  }
);

export const OFFSET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workday.params.offsetLabel',
  {
    defaultMessage: 'Offset',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.workday.params.error.requiredAction',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.components.workday.params.error.invalidAction',
  {
    defaultMessage: 'Invalid action.',
  }
);

export const WORKER_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.workday.params.error.workerIdRequired',
  {
    defaultMessage: 'Worker ID is required.',
  }
);

export const SEARCH_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.workday.params.error.searchRequired',
  {
    defaultMessage: 'Search query must be at least 3 characters.',
  }
);
