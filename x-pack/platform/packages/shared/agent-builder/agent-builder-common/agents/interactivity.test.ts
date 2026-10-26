/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from './execution_mode';
import {
  applyAgentApprovals,
  isApiAutoApproved,
  normalizeInteractive,
  toAutoApprovedApis,
} from './interactivity';

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

  it('keeps an explicit enabled', () => {
    expect(normalizeInteractive({ enabled: false }, AgentExecutionMode.conversation)).toEqual({
      enabled: false,
    });
    expect(normalizeInteractive({ enabled: true }, AgentExecutionMode.standalone)).toEqual({
      enabled: true,
    });
  });

  it('falls back to the mode default when only auto_approved_apis is supplied', () => {
    const grants = [{ target: 'elasticsearch' as const, api: 'indices.create' }];

    expect(
      normalizeInteractive({ auto_approved_apis: grants }, AgentExecutionMode.conversation)
    ).toEqual({ enabled: true, auto_approved_apis: grants });
    expect(
      normalizeInteractive({ auto_approved_apis: grants }, AgentExecutionMode.standalone)
    ).toEqual({ enabled: false, auto_approved_apis: grants });
  });
});

describe('toAutoApprovedApis', () => {
  it('flattens each target into one entry per selector', () => {
    expect(
      toAutoApprovedApis({
        elasticsearch: ['indices.create', 'indices.update_aliases'],
        kibana: ['alerting.delete-alerting-rule-id'],
      })
    ).toEqual([
      { target: 'elasticsearch', api: 'indices.create' },
      { target: 'elasticsearch', api: 'indices.update_aliases' },
      { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
    ]);
  });

  it('skips absent and empty targets', () => {
    expect(toAutoApprovedApis({ kibana: ['alerting.delete-alerting-rule-id'] })).toEqual([
      { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
    ]);
    expect(toAutoApprovedApis({ elasticsearch: [], kibana: [] })).toEqual([]);
    expect(toAutoApprovedApis({})).toEqual([]);
  });
});

describe('applyAgentApprovals', () => {
  it('returns the interactivity unchanged when the agent has no defaults', () => {
    const interactivity = {
      enabled: true,
      auto_approved_apis: [{ target: 'elasticsearch' as const, api: 'indices.create' }],
    };

    expect(applyAgentApprovals({ interactivity })).toBe(interactivity);
    expect(applyAgentApprovals({ interactivity, approvals: {} })).toBe(interactivity);
    expect(
      applyAgentApprovals({
        interactivity,
        approvals: { auto_approved_apis: { elasticsearch: [], kibana: [] } },
      })
    ).toBe(interactivity);
  });

  it('applies the defaults when the caller granted nothing, keeping enabled', () => {
    expect(
      applyAgentApprovals({
        interactivity: { enabled: false },
        approvals: { auto_approved_apis: { elasticsearch: ['indices.*'] } },
      })
    ).toEqual({
      enabled: false,
      auto_approved_apis: [{ target: 'elasticsearch', api: 'indices.*' }],
    });
    expect(
      applyAgentApprovals({
        interactivity: { enabled: true },
        approvals: { auto_approved_apis: { kibana: ['alerting.delete-alerting-rule-id'] } },
      })
    ).toEqual({
      enabled: true,
      auto_approved_apis: [{ target: 'kibana', api: 'alerting.delete-alerting-rule-id' }],
    });
  });

  it('adds the defaults to the caller grant instead of narrowing it', () => {
    const result = applyAgentApprovals({
      interactivity: {
        enabled: false,
        auto_approved_apis: [{ target: 'elasticsearch', api: 'bulk' }],
      },
      approvals: { auto_approved_apis: { elasticsearch: ['indices.*'] } },
    });

    expect(result.auto_approved_apis).toEqual([
      { target: 'elasticsearch', api: 'bulk' },
      { target: 'elasticsearch', api: 'indices.*' },
    ]);
    expect(isApiAutoApproved({ interactivity: result, target: 'elasticsearch', api: 'bulk' })).toBe(
      true
    );
    expect(
      isApiAutoApproved({ interactivity: result, target: 'elasticsearch', api: 'indices.delete' })
    ).toBe(true);
  });

  it('keeps each backend independent', () => {
    const result = applyAgentApprovals({
      interactivity: {
        enabled: false,
        auto_approved_apis: [{ target: 'kibana', api: 'alerting.delete-alerting-rule-id' }],
      },
      approvals: { auto_approved_apis: { elasticsearch: ['indices.create'] } },
    });

    expect(result.auto_approved_apis).toEqual([
      { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
      { target: 'elasticsearch', api: 'indices.create' },
    ]);
    expect(
      isApiAutoApproved({ interactivity: result, target: 'kibana', api: 'indices.create' })
    ).toBe(false);
  });

  it('deduplicates selectors granted by both sides', () => {
    expect(
      applyAgentApprovals({
        interactivity: {
          enabled: false,
          auto_approved_apis: [{ target: 'elasticsearch', api: 'indices.create' }],
        },
        approvals: { auto_approved_apis: { elasticsearch: ['indices.create', 'indices.delete'] } },
      }).auto_approved_apis
    ).toEqual([
      { target: 'elasticsearch', api: 'indices.create' },
      { target: 'elasticsearch', api: 'indices.delete' },
    ]);
  });
});

describe('isApiAutoApproved', () => {
  it('returns true when the target and api both match a grant', () => {
    expect(
      isApiAutoApproved({
        interactivity: {
          enabled: false,
          auto_approved_apis: [
            { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
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

  it('honours a namespace wildcard on the same target', () => {
    const interactivity = {
      enabled: false,
      auto_approved_apis: [{ target: 'elasticsearch' as const, api: 'indices.*' }],
    };

    expect(
      isApiAutoApproved({ interactivity, target: 'elasticsearch', api: 'indices.delete' })
    ).toBe(true);
    expect(isApiAutoApproved({ interactivity, target: 'elasticsearch', api: 'bulk' })).toBe(false);
    expect(isApiAutoApproved({ interactivity, target: 'kibana', api: 'indices.delete' })).toBe(
      false
    );
  });

  it('honours a full wildcard on the same target only', () => {
    const interactivity = {
      enabled: false,
      auto_approved_apis: [{ target: 'elasticsearch' as const, api: '*' }],
    };

    expect(isApiAutoApproved({ interactivity, target: 'elasticsearch', api: 'bulk' })).toBe(true);
    expect(
      isApiAutoApproved({ interactivity, target: 'elasticsearch', api: 'indices.delete' })
    ).toBe(true);
    expect(
      isApiAutoApproved({
        interactivity,
        target: 'kibana',
        api: 'alerting.delete-alerting-rule-id',
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
