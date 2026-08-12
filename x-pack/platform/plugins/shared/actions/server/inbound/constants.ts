/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INBOUND_EVENTS_API_PATH = '/api/events/{typeId}/{connectorId}';
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

export const INBOUND_EVENTS_TOKEN_MAX_LENGTH = 128;

/**
 * Default / schema default for `xpack.actions.inboundEvents.maxEmittedEvents`.
 */
export const INBOUND_EVENTS_MAX_EMITTED_EVENTS_DEFAULT = 25;

/** Hard ceiling for `xpack.actions.inboundEvents.maxEmittedEvents`. */
export const INBOUND_EVENTS_MAX_EMITTED_EVENTS_MAX = 250;

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
