/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';
import { normalizeInteractive } from './interactivity';

describe('normalizeInteractive', () => {
  it('defaults to enabled=true for conversation mode when input is undefined', () => {
    expect(normalizeInteractive(undefined, AgentExecutionMode.conversation)).toEqual({
      enabled: true,
    });
  });

  it('defaults to enabled=false for standalone mode when input is undefined', () => {
    expect(normalizeInteractive(undefined, AgentExecutionMode.standalone)).toEqual({
      enabled: false,
    });
  });

  it('returns the config object as-is when provided', () => {
    const cfg = { enabled: false };
    expect(normalizeInteractive(cfg, AgentExecutionMode.conversation)).toBe(cfg);
  });
});
