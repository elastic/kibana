/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import { MAX_ATTACHMENT_LEADS } from '../../common/findings_attachment';
import {
  applyEntityPivot,
  buildAgentVerifyInitialMessage,
  canOfferWindowEntityPivot,
  createDateFormatter,
  extractLeadEntityPivot,
  formatAnchorDescription,
  formatCoverageLineText,
  formatLeadShiftMultiplier,
  formatPivotEntityLabel,
  selectEmptyLeadsKind,
} from './flyout_state';

const seed: InvestigationSeed = {
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
};

describe('selectEmptyLeadsKind', () => {
  it('picks no_strong_changes only when every applicable analysis returned no_change', () => {
    expect(
      selectEmptyLeadsKind({
        catalogError: false,
        analyzerCount: 3,
        finished: true,
        leadCount: 0,
        coverage: [{ status: 'no_change' }, { status: 'no_change' }, { status: 'not_applicable' }],
      })
    ).toBe('no_strong_changes');
  });

  it('picks partial_checked when any applicable analysis was indeterminable, skipped, not_set_up, or no_access', () => {
    for (const status of ['indeterminable', 'skipped', 'not_set_up', 'no_access'] as const) {
      expect(
        selectEmptyLeadsKind({
          catalogError: false,
          analyzerCount: 2,
          finished: true,
          leadCount: 0,
          coverage: [{ status: 'no_change' }, { status }],
        })
      ).toBe('partial_checked');
    }
  });

  it('separates a failed catalog request from an empty plan', () => {
    expect(
      selectEmptyLeadsKind({
        catalogError: true,
        analyzerCount: 0,
        finished: false,
        leadCount: 0,
        coverage: [],
      })
    ).toBe('catalog_error');

    expect(
      selectEmptyLeadsKind({
        catalogError: false,
        analyzerCount: 2,
        finished: true,
        leadCount: 0,
        coverage: [{ status: 'not_applicable' }, { status: 'not_applicable' }],
      })
    ).toBe('no_entity');
  });
});

describe('formatCoverageLineText', () => {
  it('includes the technique name, what it ran on, and the found count', () => {
    expect(
      formatCoverageLineText(
        {
          id: 'service_change_points',
          name: 'Service change points',
          technique: 'Change point detection',
          status: 'found',
          foundCount: 2,
          toolLinkLabel: 'Open Change Point Detection (related tool)',
        },
        seed
      )
    ).toBe('Change point detection (Service change points for checkout): 2 changes found');
  });

  it('appends a distinct detail message once after the status', () => {
    expect(
      formatCoverageLineText(
        {
          id: 'log_change_points',
          name: 'Log change points',
          technique: 'Change point detection',
          status: 'indeterminable',
          foundCount: 0,
          message: 'Not enough data to decide',
          toolLinkLabel: 'Open Log Pattern Analysis (related tool)',
        },
        seed
      )
    ).toBe(
      'Change point detection (Log change points for checkout): couldn’t decide. Not enough data to decide'
    );
  });

  it('shows only the status when there is no detail message', () => {
    expect(
      formatCoverageLineText(
        {
          id: 'service_change_points',
          name: 'Service change points',
          technique: 'Change point detection',
          status: 'no_access',
          foundCount: 0,
          toolLinkLabel: 'Open Change Point Detection (related tool)',
        },
        seed
      )
    ).toBe('Change point detection (Service change points for checkout): Skipped: no access');
  });

  it('appends the comparison windows when present', () => {
    const formatDate = createDateFormatter('YYYY-MM-DD');
    expect(
      formatCoverageLineText(
        {
          id: 'log_rate_analysis',
          name: 'Log rate analysis',
          technique: 'Log rate analysis',
          status: 'indeterminable',
          foundCount: 0,
          message: 'Not enough data in the baseline or deviation window',
          comparison: {
            baseline: {
              from: '2026-10-31T12:00:00.000Z',
              to: '2026-11-01T12:00:00.000Z',
            },
            deviation: {
              from: '2026-11-01T12:00:00.000Z',
              to: '2026-11-02T12:00:00.000Z',
            },
          },
          toolLinkLabel: 'Open Log Rate Analysis',
        },
        seed,
        formatDate
      )
    ).toContain(
      'Not enough data in the baseline or deviation window (2026-11-01 to 2026-11-02 compared with 2026-10-31 to 2026-11-01)'
    );
  });
});

describe('entity pivot helpers', () => {
  it('shortens display labels at 120 characters without altering applyEntityPivot values', () => {
    const longValue = 'p'.repeat(150);
    expect(formatPivotEntityLabel(longValue)).toBe(`${'p'.repeat(120)}…`);

    const pivoted = applyEntityPivot(
      { ...seed, entities: { 'host.name': 'old-host' }, hosts: ['old-host'] },
      { field: 'service.name', value: longValue }
    );
    expect(pivoted.entities).toEqual({ 'service.name': longValue });
    expect(pivoted.hosts).toBeUndefined();
  });

  it('checks service.name, host.name, user.name, source.ip, and seed.hosts in canOfferWindowEntityPivot', () => {
    expect(canOfferWindowEntityPivot({ ...seed, entities: {} })).toBe(true);
    expect(canOfferWindowEntityPivot(seed)).toBe(false);
    expect(canOfferWindowEntityPivot({ ...seed, entities: { 'host.name': 'host-1' } })).toBe(false);
    expect(canOfferWindowEntityPivot({ ...seed, entities: { 'user.name': 'jdoe' } })).toBe(false);
    expect(canOfferWindowEntityPivot({ ...seed, entities: { 'source.ip': '203.0.113.10' } })).toBe(
      false
    );
    expect(canOfferWindowEntityPivot({ ...seed, entities: {}, hosts: ['host-1'] })).toBe(false);
  });

  it('extracts lead-level pivots for dependency, host metric, and service/host log rate leads', () => {
    expect(
      extractLeadEntityPivot(
        {
          id: 'dep-1',
          analyzerId: 'dependency_change_points',
          summary: 'Latency spike on redis',
          relevance: 'One-hop dependency redis',
          ranking: { signal: 'strong', timing: 'during', relationship: 'dependency' },
          locatorParams: { dependencyName: 'redis' },
        },
        seed
      )
    ).toEqual({ field: 'service.name', value: 'redis' });

    expect(
      extractLeadEntityPivot(
        {
          id: 'host-1',
          analyzerId: 'metric_change_points',
          summary: 'CPU usage spike on host-a',
          relevance: 'Host host-a',
          ranking: { signal: 'strong', timing: 'during', relationship: 'host' },
          locatorParams: { hostName: 'host-a' },
        },
        seed
      )
    ).toEqual({ field: 'host.name', value: 'host-a' });

    expect(
      extractLeadEntityPivot(
        {
          id: 'lra-1',
          analyzerId: 'log_rate_analysis',
          summary: 'service.name: "payments"',
          relevance: 'Logs in the selected window',
          ranking: { signal: 'strong', timing: 'during', relationship: 'unknown' },
          locatorParams: { leadField: 'service.name', leadValue: 'payments' },
        },
        { ...seed, entities: {} }
      )
    ).toEqual({ field: 'service.name', value: 'payments' });

    expect(
      extractLeadEntityPivot(
        {
          id: 'lra-user',
          analyzerId: 'log_rate_analysis',
          summary: 'user.name: "jdoe"',
          relevance: 'Logs for source IP 203.0.113.10',
          ranking: { signal: 'strong', timing: 'during', relationship: 'network' },
          locatorParams: { leadField: 'user.name', leadValue: 'jdoe' },
        },
        { ...seed, entities: { 'source.ip': '203.0.113.10' } }
      )
    ).toEqual({ field: 'user.name', value: 'jdoe' });

    expect(
      extractLeadEntityPivot(
        {
          id: 'lra-ip',
          analyzerId: 'log_rate_analysis',
          summary: 'source.ip: "203.0.113.10"',
          relevance: 'Logs for user jdoe',
          ranking: { signal: 'strong', timing: 'during', relationship: 'user' },
          locatorParams: { leadField: 'source.ip', leadValue: '203.0.113.10' },
        },
        { ...seed, entities: { 'user.name': 'jdoe' } }
      )
    ).toEqual({ field: 'source.ip', value: '203.0.113.10' });
  });

  it('formats spike, dip, and New shift labels and omits zero-deviation or equal shifts', () => {
    expect(formatLeadShiftMultiplier({ baseline: 10, deviation: 50, kind: 'document_rate' })).toBe(
      '5× higher'
    );
    expect(formatLeadShiftMultiplier({ baseline: 50, deviation: 10, kind: 'document_rate' })).toBe(
      '5× lower'
    );
    expect(formatLeadShiftMultiplier({ baseline: 0, deviation: 50, kind: 'document_rate' })).toBe(
      'New'
    );
    expect(
      formatLeadShiftMultiplier({ baseline: 0, deviation: 0, kind: 'document_rate' })
    ).toBeUndefined();
    expect(
      formatLeadShiftMultiplier({ baseline: 50, deviation: 0, kind: 'document_rate' })
    ).toBeUndefined();
    expect(
      formatLeadShiftMultiplier({ baseline: 20, deviation: 20, kind: 'document_rate' })
    ).toBeUndefined();
  });

  it('saves and restores investigation history and votes only when the initial seed matches and is unexpired', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const pivotedSeed = applyEntityPivot(seed, { field: 'service.name', value: 'payments' });
    const now = 1_700_000_000_000;

    const {
      INVESTIGATION_SESSION_STORAGE_KEY,
      INVESTIGATION_SESSION_TTL_MS,
      loadInvestigationSession,
      saveInvestigationSession,
    } = jest.requireActual('./flyout_state') as typeof import('./flyout_state');

    saveInvestigationSession({
      initialSeed: seed,
      history: [
        { seed, metricId: 'm1' },
        { seed: pivotedSeed, metricId: 'm2' },
      ],
      feedbackByLead: { 'lead-1': 'useful', 'lead-2': undefined },
      storage: mockStorage,
      now,
    });

    const restored = {
      history: [
        { seed, metricId: 'm1' },
        { seed: pivotedSeed, metricId: 'm2' },
      ],
      feedbackByLead: { 'lead-1': 'useful' },
    };

    expect(
      loadInvestigationSession({
        initialSeed: seed,
        storage: mockStorage,
        now: now + 60_000,
      })
    ).toEqual(restored);

    // Explicit undefined fields are absent after the stored JSON round trip
    expect(
      loadInvestigationSession({
        initialSeed: { ...seed, query: undefined },
        storage: mockStorage,
        now: now + 60_000,
      })
    ).toEqual(restored);

    // Different query or filters do not match
    expect(
      loadInvestigationSession({
        initialSeed: { ...seed, query: { language: 'kuery', query: 'status:500' } },
        storage: mockStorage,
        now: now + 60_000,
      })
    ).toBeUndefined();
    expect(
      loadInvestigationSession({
        initialSeed: {
          ...seed,
          filters: [{ meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } }],
        },
        storage: mockStorage,
        now: now + 60_000,
      })
    ).toBeUndefined();

    // Expired entry is ignored
    expect(
      loadInvestigationSession({
        initialSeed: seed,
        storage: mockStorage,
        now: now + INVESTIGATION_SESSION_TTL_MS + 1,
      })
    ).toBeUndefined();

    // Malformed or mismatched version is ignored
    store.set(INVESTIGATION_SESSION_STORAGE_KEY, '{not-json');
    expect(
      loadInvestigationSession({ initialSeed: seed, storage: mockStorage, now })
    ).toBeUndefined();

    store.set(
      INVESTIGATION_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 99,
        savedAt: now,
        initialSeed: seed,
        history: [{ seed }],
        feedbackByLead: {},
      })
    );
    expect(
      loadInvestigationSession({ initialSeed: seed, storage: mockStorage, now })
    ).toBeUndefined();
  });

  it('selects the voted prompt only when a vote belongs to an attached lead', () => {
    const attachedLeads = [{ id: 'lead-1' }];
    const defaultPrompt = 'Verify the top investigation leads and summarize what they suggest.';
    const votedPrompt =
      'Verify the investigation leads marked useful, treat leads marked not useful as dismissed, and summarize what the remaining evidence suggests.';

    expect(buildAgentVerifyInitialMessage([], {})).toBe(defaultPrompt);
    expect(buildAgentVerifyInitialMessage(attachedLeads, { 'lead-1': 'useful' })).toBe(votedPrompt);

    const rankedLeads = Array.from({ length: MAX_ATTACHMENT_LEADS + 1 }, (_, index) => ({
      id: `lead-${index}`,
    }));
    expect(
      buildAgentVerifyInitialMessage(rankedLeads, {
        [`lead-${MAX_ATTACHMENT_LEADS}`]: 'useful',
      })
    ).toBe(defaultPrompt);
    expect(buildAgentVerifyInitialMessage(rankedLeads, { 'lead-0': 'not_useful' })).toBe(
      votedPrompt
    );
  });
});

describe('formatAnchorDescription', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats ISO and date-math bounds with the user date format', () => {
    const formatDate = createDateFormatter('YYYY-MM-DD');
    expect(
      formatAnchorDescription(
        { ...seed, timeRange: { from: '2026-11-02T11:00:00.000Z', to: 'now' } },
        formatDate
      )
    ).toBe('checkout · 2026-11-02 to 2026-11-03');
  });
});
