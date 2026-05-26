/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_API_PATH } from './constants';

/**
 * URL for a single rule resource: `${RULE_API_PATH}/${encodedId}`.
 *
 * Always pass through `encodeURIComponent` so callers cannot accidentally
 * leak unencoded characters into path segments — important for the validation
 * tests that craft pathological ids.
 */
export const getRuleUrl = (id: string) => `${RULE_API_PATH}/${encodeURIComponent(id)}`;
