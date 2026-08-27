/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';
import { isApiAutoApproved, normalizeInteractive } from './interactivity';

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

describe('isApiAutoApproved', () => {
  it('returns true when the target and api both match a grant', () => {
    expect(
      isApiAutoApproved({
        interactivity: {
          enabled: false,
          auto_approved_apis: [
            { target: 'kibana', api: 'cases.create' },
            { target: 'elasticsearch', api: 'indices.create' },
          ],
        },
        target: 'elasticsearch',
        api: 'indices.create',
      })
    ).toBe(true);
  });

  it('returns false when the api matches but the target does not', () => {
    expect(
      isApiAutoApproved({
        interactivity: {
          enabled: false,
          auto_approved_apis: [{ target: 'kibana', api: 'indices.create' }],
        },
        target: 'elasticsearch',
        api: 'indices.create',
      })
    ).toBe(false);
  });

  it('returns false when the target matches but the api does not', () => {
    expect(
      isApiAutoApproved({
        interactivity: {
          enabled: false,
          auto_approved_apis: [{ target: 'elasticsearch', api: 'indices.create' }],
        },
        target: 'elasticsearch',
        api: 'indices.delete',
      })
    ).toBe(false);
  });

  it('does not treat the api as a prefix or namespace match', () => {
    expect(
      isApiAutoApproved({
        interactivity: {
          enabled: false,
          auto_approved_apis: [{ target: 'elasticsearch', api: 'indices' }],
        },
        target: 'elasticsearch',
        api: 'indices.create',
      })
    ).toBe(false);
  });

  it('returns false when the config has no grants', () => {
    expect(
      isApiAutoApproved({
        interactivity: { enabled: true },
        target: 'elasticsearch',
        api: 'indices.create',
      })
    ).toBe(false);

    expect(
      isApiAutoApproved({
        interactivity: { enabled: true, auto_approved_apis: [] },
        target: 'elasticsearch',
        api: 'indices.create',
      })
    ).toBe(false);
  });
});
