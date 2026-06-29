/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** EUI icon names for Alerting V2 rule kind badges. */
export const RULE_KIND_ICONS = {
  alert: 'bell',
  signal: 'radar',
} as const satisfies Record<'alert' | 'signal', string>;
