/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The backends the API tools (`discover_apis`, `describe_api`, `execute_api`) can operate on.
 */
export const apiTargets = ['elasticsearch', 'kibana'] as const;

/**
 * The backend an API operation belongs to.
 */
export type ApiTarget = (typeof apiTargets)[number];
