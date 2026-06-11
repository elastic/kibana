/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Rule-on-rule schedule defaults — aligned with v1 detection workflow inputs. */
export const RULE_ON_RULE_SCHEDULE_EVERY = '5m' as const;
export const RULE_ON_RULE_SCHEDULE_LOOKBACK = '30m' as const;
export const RULE_ON_RULE_BUCKET_INTERVAL = '30 seconds' as const;

export const TAG_RULE_ON_RULE = 'sigevents:rule-on-rule' as const;
export const TAG_RULE_ON_RULE_PREFIX = 'sigevents:rule-on-rule:' as const;
export const TAG_STREAM_PREFIX = 'sigevents:stream:' as const;
export const TAG_MONITORED_PREFIX = 'sigevents:monitored:' as const;
export const TAG_SYSTEM_MANAGED = 'sigevents:system-managed' as const;

export const UNKNOWN_STREAM_TAG = '_unknown' as const;

export const RULE_ON_RULE_NAME_PREFIX = '[SigEvents] Change detection' as const;
