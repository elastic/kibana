/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  discoveryStem,
  discoveryWriteHandler,
  generateDiscoverySlug,
  incidentFingerprint,
  parseDateMathToMs,
} from './handler';

const baseInput = {
  kind: 'discovery' as const,
  title: 'Checkout latency',
  summary: 'P99 latency breached SLO',
  root_cause: 'Connection pool exhaustion',
  impact: 'high' as const,
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

  it('falls back to "unknown" when arrays are empty', () => {
    const slug = generateDiscoverySlug([], []);
    expect(slug).toMatch(/^unknown__unknown-[a-f0-9]{8}$/);
  });

  it('appends a fresh suffix on each call for the same stem', () => {
    const a = generateDiscoverySlug(['logs.checkout'], ['high-latency-rule']);
    const b = generateDiscoverySlug(['logs.checkout'], ['high-latency-rule']);
    expect(a).not.toBe(b);
  });
});

describe('parseDateMathToMs', () => {
  it('parses hours', () => expect(parseDateMathToMs('now-1h')).toBe(3600000));
  it('parses minutes', () => expect(parseDateMathToMs('now-30m')).toBe(1800000));
  it('parses seconds', () => expect(parseDateMathToMs('now-10s')).toBe(10000));
  it('parses days', () => expect(parseDateMathToMs('now-1d')).toBe(86400000));
  it('returns undefined for unrecognised expressions', () =>
    expect(parseDateMathToMs('invalid')).toBeUndefined());
});

describe('discoveryWriteHandler', () => {
  it('writes a new discovery and returns a generated slug', async () => {
    const discoveryClient = {
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

  it('uses provided discovery_slug verbatim', async () => {
    const discoveryClient = {
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, discovery_slug: 'checkout__my-slug-abc12345' },
    });

    expect(result.discovery_slug).toBe('checkout__my-slug-abc12345');
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

  it('does not skip write when the primary rule differs even within window', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'other-disc-id',
            discovery_slug: 'checkout__other-rule-abc12345',
            kind: 'discovery',
            stream_names: ['logs.checkout'],
            rule_names: ['other-rule'],
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

  it('does not skip write when only the kind differs for a matching stem', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'other-disc-id',
            discovery_slug: 'checkout__high-latency-rule-abc12345',
            kind: 'clearance',
            stream_names: ['logs.checkout'],
            rule_names: ['high-latency-rule'],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, kind: 'discovery', dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('deduplicates when the prior doc lists the same streams/rules in a different order', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'existing-disc-id',
            discovery_slug: 'checkout__rule-a-abc12345',
            kind: 'discovery',
            stream_names: ['logs.payments', 'logs.checkout'],
            rule_names: ['rule-b', 'rule-a'],
          },
        ],
      }),
      bulkCreate: jest.fn(),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        stream_names: ['logs.checkout', 'logs.payments'],
        rule_names: ['rule-a', 'rule-b'],
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.existing_discovery_id).toBe('existing-disc-id');
  });

  it('does not dedup when the rule set drifts — continuation is handled upstream via explicit slug', async () => {
    // Rule set changed this cycle — not a duplicate. Continuation reuses an explicit slug (which
    // skips dedup); the net only catches the same incident opened twice as new.
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'existing-disc-id',
            discovery_slug: 'checkout__high-latency-rule-abc12345',
            kind: 'discovery',
            stream_names: ['logs.checkout'],
            rule_names: ['high-latency-rule', 'stale-secondary-rule'],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        stream_names: ['logs.checkout'],
        rule_names: ['high-latency-rule', 'fresh-secondary-rule'],
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('writes continuation discovery when explicit slug matches recent prior doc within dedup window', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
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

  it('writes clearance when prior discovery doc exists within dedup window', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'clearance',
        discovery_slug: 'checkout__latency-abc12345',
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
        discovery_slug: 'checkout__latency-abc12345',
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
        discovery_slug: 'checkout__latency-abc12345',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
  });
});
