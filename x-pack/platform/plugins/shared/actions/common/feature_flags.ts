/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * LaunchDarkly kill switch for inbound connector event ingress. Fallback is true.
 * `xpack.actions.inboundEvents.enabled` remains the hard gate; this flag can only force ingress off.
 */
export const ACTIONS_INBOUND_EVENTS_ENABLED_FLAG = 'actions.inboundEventsEnabled';
