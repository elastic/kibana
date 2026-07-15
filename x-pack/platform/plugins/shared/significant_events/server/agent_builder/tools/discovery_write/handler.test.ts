/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryDetection, DiscoveryEvidence, DiscoveryWriteInput } from './handler';
import {
  discoveryStem,
  discoveryWriteHandler,
  generateDiscoverySlug,
  incidentFingerprint,
  mergeDetectionsLatestPerRule,
  mergeEvidencesForCarriedRules,
} from './handler';

const baseInput: DiscoveryWriteInput = {
  kind: 'discovery',
  title: 'Checkout latency',
  summary: 'P99 latency breached SLO',
  root_cause: 'Connection pool exhaustion',
  impact: 'high',
  rule_names: ['high-latency-rule'],
  stream_names: ['logs.checkout'],
  criticality: 80,
  confidence: 0.8,
  detections: [],
  dependency_edges: [],
  infra_components: [],
  cause_kis: [],
  evidences: [],
};

describe('incidentFingerprint', () => {
  it('is independent of the order stream_names/rule_names are emitted in', () => {
    expect(
      incidentFingerprint('discovery', ['logs.checkout', 'logs.payments'], ['rule-b', 'rule-a'])
    ).toBe(
      incidentFingerprint('discovery', ['logs.payments', 'logs.checkout'], ['rule-a', 'rule-b'])
    );
  });

  it('differs when the stream set differs', () => {
    expect(incidentFingerprint('discovery', ['logs.checkout'], ['rule-a'])).not.toBe(
      incidentFingerprint('discovery', ['logs.payments'], ['rule-a'])
    );
  });

  it('differs when the rule set differs', () => {
    expect(incidentFingerprint('discovery', ['logs.checkout'], ['rule-a'])).not.toBe(
      incidentFingerprint('discovery', ['logs.checkout'], ['rule-a', 'rule-b'])
    );
  });

  it('differs when the kind differs', () => {
    expect(incidentFingerprint('discovery', ['logs.checkout'], ['rule-a'])).not.toBe(
      incidentFingerprint('clearance', ['logs.checkout'], ['rule-a'])
    );
  });

  it('does not mutate the input arrays', () => {
    const streamNames = ['logs.payments', 'logs.checkout'];
    const ruleNames = ['rule-b', 'rule-a'];
    incidentFingerprint('discovery', streamNames, ruleNames);
    expect(streamNames).toEqual(['logs.payments', 'logs.checkout']);
    expect(ruleNames).toEqual(['rule-b', 'rule-a']);
  });
});

describe('discoveryStem', () => {
  it('builds a display stem from the smallest stream last segment and rule name', () => {
    expect(discoveryStem(['logs.checkout.service'], ['high latency rule'])).toBe(
      'service__high-latency-rule'
    );
  });

  it('is deterministic regardless of array order', () => {
    expect(discoveryStem(['logs.payments', 'logs.checkout'], ['rule-b', 'rule-a'])).toBe(
      'checkout__rule-a'
    );
  });

  it('falls back to "unknown" when arrays are empty', () => {
    expect(discoveryStem([], [])).toBe('unknown__unknown');
  });

  it('truncates long rule names to 40 characters', () => {
    const rulePart = discoveryStem(['logs.a'], ['a'.repeat(60)]).split('__')[1];
    expect(rulePart.length).toBeLessThanOrEqual(40);
  });
});

describe('generateDiscoverySlug', () => {
  it('builds slug from the stem plus a uuid8 suffix', () => {
    const slug = generateDiscoverySlug(['logs.checkout.service'], ['high latency rule']);
    expect(slug).toMatch(/^service__high-latency-rule-[a-f0-9]{8}$/);
  });

  it('appends a fresh suffix on each call for the same stem', () => {
    const a = generateDiscoverySlug(['logs.checkout'], ['high-latency-rule']);
    const b = generateDiscoverySlug(['logs.checkout'], ['high-latency-rule']);
    expect(a).not.toBe(b);
  });
});

describe('discoveryWriteHandler', () => {
  it('writes a new discovery and returns a generated slug', async () => {
    const discoveryClient = {
      findStateBySlug: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate).toHaveBeenCalledWith(expect.any(Array), {
      throwOnFail: true,
    });
    expect(result.written).toBe(true);
    expect(result.discovery_slug).toMatch(/^checkout__high-latency-rule-[a-f0-9]{8}$/);
  });

  it('skips write when duplicate of same kind exists within dedup window for auto-generated slug', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'existing-disc-id',
            discovery_slug: 'checkout__high-latency-rule-abc12345',
            kind: 'discovery',
            stream_names: ['logs.checkout'],
            rule_names: ['high-latency-rule'],
          },
        ],
      }),
      bulkCreate: jest.fn(),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String) })
    );
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('duplicate_within_window');
    expect(result.existing_discovery_id).toBe('existing-disc-id');
    expect(result.discovery_slug).toBe('checkout__high-latency-rule-abc12345');
  });

  it('does not skip write when stream_names differ even within window', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'other-disc-id',
            discovery_slug: 'payments__high-latency-rule-abc12345',
            kind: 'discovery',
            stream_names: ['logs.payments'],
            rule_names: ['high-latency-rule'],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('writes continuation discovery when explicit slug matches recent prior doc within dedup window', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findStateBySlug: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        discovery_slug: 'checkout__latency-abc12345',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.discovery_slug).toBe('checkout__latency-abc12345');
  });

  it('skips dedup for clearance writes', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'clearance',
        parent_discovery_id: 'prior-disc-id',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.kind).toBe('clearance');
  });

  it('does not skip when no matching discovery exists within the dedup window', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup when dedup_window is unrecognised', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        dedup_window: 'invalid',
      },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup check for kind:handled', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'handled',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
  });
});

const createDetection = (
  ruleUuid: string,
  extra: Partial<DiscoveryDetection> = {}
): DiscoveryDetection => ({
  detection_id: `${ruleUuid}-det`,
  rule_uuid: ruleUuid,
  rule_name: ruleUuid,
  stream_name: 'logs.otel',
  change_point_type: 'spike',
  p_value: 1,
  ...extra,
});

const detectionsByRule = (detections: DiscoveryDetection[]): Record<string, DiscoveryDetection> =>
  Object.fromEntries(detections.map((d) => [d.rule_uuid, d]));

describe('mergeDetectionsLatestPerRule', () => {
  it('keeps the submitted detection for an overlapping rule_uuid (latest wins)', () => {
    const prior = [
      {
        '@timestamp': 't1',
        detections: [
          createDetection('ruleA'),
          createDetection('ruleB', { change_point_type: 'spike' }),
        ],
      },
    ];
    const submitted = [createDetection('ruleB', { change_point_type: 'dip' })];
    const map = detectionsByRule(mergeDetectionsLatestPerRule(prior, submitted, 't2'));
    expect(Object.keys(map).sort()).toEqual(['ruleA', 'ruleB']);
    expect(map.ruleB.change_point_type).toBe('dip'); // submitted (t2 > t1) wins
    expect(map.ruleA.change_point_type).toBe('spike'); // prior-only rule retained
  });

  it('returns the submitted set unchanged when there are no prior docs', () => {
    const merged = mergeDetectionsLatestPerRule([], [createDetection('ruleA')], 't2');
    expect(merged).toHaveLength(1);
    expect(detectionsByRule(merged).ruleA).toBeDefined();
  });

  it('takes the newest prior doc for a rule present in multiple cycles', () => {
    const prior = [
      { '@timestamp': 't2', detections: [createDetection('ruleA', { change_point_type: 'dip' })] },
      {
        '@timestamp': 't1',
        detections: [createDetection('ruleA', { change_point_type: 'spike' })],
      },
    ];
    // submitted is older than both priors, so the newest prior (t2) must win.
    const map = detectionsByRule(mergeDetectionsLatestPerRule(prior, [], 't0'));
    expect(map.ruleA.change_point_type).toBe('dip');
  });

  it('resolves an equal-timestamp tie in favour of the submitted set', () => {
    const prior = [
      {
        '@timestamp': 't1',
        detections: [createDetection('ruleA', { change_point_type: 'spike' })],
      },
    ];
    const submitted = [createDetection('ruleA', { change_point_type: 'dip' })];
    const map = detectionsByRule(mergeDetectionsLatestPerRule(prior, submitted, 't1'));
    expect(map.ruleA.change_point_type).toBe('dip');
  });
});

describe('discoveryWriteHandler — continuation snapshot merge', () => {
  it('persists the full episode detection set (prior slug doc ∪ submitted, latest per rule)', async () => {
    const discoveryClient = {
      findStateBySlug: jest.fn().mockResolvedValue({
        hits: [
          {
            '@timestamp': '2026-01-01T00:00:00.000Z',
            detections: [createDetection('ruleA')],
          },
          {
            '@timestamp': '2026-01-02T00:00:00.000Z',
            detections: [createDetection('ruleB', { change_point_type: 'spike' })],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        discovery_slug: 'otel__x-abc12345',
        detections: [createDetection('ruleB', { change_point_type: 'dip' })],
      },
    });

    expect(discoveryClient.findStateBySlug).toHaveBeenCalledWith('otel__x-abc12345');
    const persisted: DiscoveryDetection[] =
      discoveryClient.bulkCreate.mock.calls[0][0][0].detections;
    expect(Object.keys(detectionsByRule(persisted)).sort()).toEqual(['ruleA', 'ruleB']); // ruleA carried forward
  });

  it('does not merge or fetch prior docs for a handled marker write', async () => {
    const discoveryClient = {
      findStateBySlug: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'handled',
        discovery_slug: 'otel__x-abc12345',
        previous_discovery_id: 'source-discovery-id',
        detections: [],
      },
    });

    expect(discoveryClient.findStateBySlug).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].detections).toEqual([]);
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].previous_discovery_id).toBe(
      'source-discovery-id'
    );
  });

  it('does not fetch prior docs for a new-episode (auto-slug) write', async () => {
    const discoveryClient = {
      findStateBySlug: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, detections: [createDetection('ruleA')] },
    });

    expect(discoveryClient.findStateBySlug).not.toHaveBeenCalled();
  });
});

const createEvidence = (
  ruleUuid: string | null,
  extra: Partial<DiscoveryEvidence> = {}
): DiscoveryEvidence => ({
  ...(ruleUuid ? { rule_uuid: ruleUuid, rule_name: ruleUuid } : {}),
  result: 'found',
  esql_query: `Q(${ruleUuid ?? 'supplemental'})`,
  ...extra,
});

const evidencesByRule = (evidences: DiscoveryEvidence[]): Record<string, DiscoveryEvidence> =>
  Object.fromEntries(evidences.filter((e) => e.rule_uuid).map((e) => [e.rule_uuid ?? '', e]));

describe('mergeEvidencesForCarriedRules', () => {
  it('keeps all submitted evidence (rule-keyed and keyless) unchanged', () => {
    const submitted = [createEvidence('ruleA'), createEvidence(null)];
    const merged = mergeEvidencesForCarriedRules([], submitted);
    expect(merged).toHaveLength(2);
    expect(merged.filter((e) => !e.rule_uuid)).toHaveLength(1); // keyless kept
  });

  it('carries a prior rule-keyed evidence for a rule absent from the submitted set', () => {
    const prior = [
      { '@timestamp': 't1', evidences: [createEvidence('ruleA'), createEvidence('ruleB')] },
    ];
    const merged = mergeEvidencesForCarriedRules(prior, [
      createEvidence('ruleB', { esql_query: 'fresh' }),
    ]);
    const map = evidencesByRule(merged);
    expect(Object.keys(map).sort()).toEqual(['ruleA', 'ruleB']);
    expect(map.ruleB.esql_query).toBe('fresh'); // submitted wins for ruleB
    expect(map.ruleA.esql_query).toBe('Q(ruleA)'); // ruleA carried from prior
  });

  it('drops keyless (supplemental) prior evidence', () => {
    const prior = [
      { '@timestamp': 't1', evidences: [createEvidence(null), createEvidence('ruleA')] },
    ];
    const merged = mergeEvidencesForCarriedRules(prior, []);
    expect(merged).toHaveLength(1); // only ruleA carried; keyless prior dropped
    expect(merged[0].rule_uuid).toBe('ruleA');
  });

  it('carries the newest prior evidence for a rule present in multiple cycles', () => {
    const prior = [
      { '@timestamp': 't1', evidences: [createEvidence('ruleA', { esql_query: 'old' })] },
      { '@timestamp': 't2', evidences: [createEvidence('ruleA', { esql_query: 'new' })] },
    ];
    const merged = mergeEvidencesForCarriedRules(prior, []);
    expect(evidencesByRule(merged).ruleA.esql_query).toBe('new');
  });
});

describe('discoveryWriteHandler — continuation evidence merge', () => {
  it('persists submitted evidence plus carried-forward evidence for detections not re-investigated', async () => {
    const discoveryClient = {
      findStateBySlug: jest.fn().mockResolvedValue({
        hits: [
          {
            '@timestamp': '2026-01-01T00:00:00.000Z',
            detections: [createDetection('ruleA'), createDetection('ruleB')],
            evidences: [createEvidence('ruleA'), createEvidence('ruleB', { esql_query: 'stale' })],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        discovery_slug: 'otel__x-abc12345',
        detections: [createDetection('ruleB')], // only ruleB re-investigated this cycle
        evidences: [createEvidence('ruleB', { esql_query: 'fresh' })],
      },
    });

    const persisted: DiscoveryEvidence[] = discoveryClient.bulkCreate.mock.calls[0][0][0].evidences;
    // Both detections' rules carry evidence: ruleB fresh (submitted), ruleA carried from prior.
    expect(Object.keys(evidencesByRule(persisted)).sort()).toEqual(['ruleA', 'ruleB']);
  });
});
