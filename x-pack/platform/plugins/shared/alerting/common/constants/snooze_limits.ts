/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max snoozed alert instances per rule (aligned with max alerts per rule). */
export const MAX_SNOOZED_INSTANCES = 1000;

/** Max conditions per snooze entry that auto-lift the snooze. */
export const MAX_SNOOZE_CONDITIONS_PER_ENTRY = 10;
