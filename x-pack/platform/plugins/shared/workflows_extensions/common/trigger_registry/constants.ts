/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Field prefix used in trigger condition KQL (e.g. "event.severity").
 * Use this when calling validateKqlAgainstSchema for trigger conditions so paths and error messages stay consistent.
 */
export const EVENT_FIELD_PREFIX = 'event.';
