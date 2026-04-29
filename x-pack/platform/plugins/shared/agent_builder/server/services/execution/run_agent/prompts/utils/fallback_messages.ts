/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Static fallback message surfaced to the user when the agent hits the hard
 * cycle limit without producing a HandoverAction. Used by the
 * `prepareFallbackAnswer` graph node in non-structured mode.
 */
export const createCycleLimitFallbackMessage = (): string => {
  return "I ran out of steps before finishing this task. Here's what I gathered so far — feel free to ask me to continue.";
};
