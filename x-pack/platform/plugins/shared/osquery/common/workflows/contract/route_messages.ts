/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Messages of the live-query route's 400s that the workflow step maps to error codes. The route
 * and the step import them from here, so rewording one cannot silently turn a mapped code into
 * `REQUEST_REJECTED`.
 */
export const NO_AGENTS_FOUND_MESSAGE = 'No agents found for selection';

export const agentLimitMessage = (total: number, limit: number): string =>
  `The selection matches ${total} agents, above the limit of ${limit}. Narrow it down.`;

export const AGENT_LIMIT_MESSAGE_PATTERN = /above the limit of \d+/i;
