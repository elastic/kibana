/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { BASE_ACTION_API_PATH } from '../../common';

export const INBOUND_EVENTS_API_PATH = `${BASE_ACTION_API_PATH}/events/{connector_type_id}/{connector_id}`;
export const INBOUND_EVENTS_API_VERSION = '2023-10-31';

export const INBOUND_EVENTS_DISABLED_MESSAGE = i18n.translate(
  'xpack.actions.inboundEvents.disabledError',
  {
    defaultMessage: 'Inbound connector events are disabled',
  }
);

export const INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE = i18n.translate(
  'xpack.actions.inboundEvents.unexpectedError',
  {
    defaultMessage: 'Unable to process inbound connector event request.',
  }
);

/**
 * Default / schema default for `xpack.actions.inboundEvents.maxEmitted`.
 */
export const INBOUND_EVENTS_MAX_EMITTED_DEFAULT = 25;

/** Hard ceiling for `xpack.actions.inboundEvents.maxEmitted`. */
export const INBOUND_EVENTS_MAX_EMITTED_LIMIT = 250;

export const INBOUND_EVENTS_SECURITY = {
  authc: {
    enabled: false,
    reason: 'Inbound connector events authenticate with connector-scoped ingest tokens.',
  },
  authz: {
    enabled: false,
    reason: 'Authorization is delegated to connector ingress token verification.',
  },
} as const;
