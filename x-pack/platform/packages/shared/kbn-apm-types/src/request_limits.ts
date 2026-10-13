/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Upper bounds for request inputs (DoS hardening). Names, types and environments are ECS keyword
// fields indexed with `ignore_above: 1024`, so longer values can never match a document.
export const MAX_FIELD_VALUE_LENGTH = 1_024;
export const MAX_KUERY_LENGTH = 10_000; // KQL expressions can be long
export const MAX_ARRAY_ITEMS = 100;
