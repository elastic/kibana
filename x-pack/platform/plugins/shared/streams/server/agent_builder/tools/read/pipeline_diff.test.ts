/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { buildDropWarnings, computePipelineDiff, labelForStep } from './pipeline_diff';

const grokStep = (overrides: Partial<Record<string, unknown>> = {}): StreamlangStep =>
  ({
    action: 'grok',
    from: 'body.text',
    patterns: ['%{IP:attributes.source.ip}'],
    ignore_failure: true,
    ...overrides,
  } as unknown as StreamlangStep);

const setStep = (
  to: string,
  value: string,
  overrides: Partial<Record<string, unknown>> = {}
): StreamlangStep =>
  ({
    action: 'set',
    to,
    value,
    ignore_failure: true,
    ...overrides,
  } as unknown as StreamlangStep);

const dateStep = (): StreamlangStep =>
  ({
    action: 'date',
    from: 'attributes.custom.timestamp',
    to: '@timestamp',
    formats: ['ISO8601'],
    ignore_failure: true,
  } as unknown as StreamlangStep);

const conditionStep = (steps: StreamlangStep[]): StreamlangStep =>
  ({
    condition: {
      field: 'severity_text',
      eq: 'ERROR',
      steps,
    },
  } as unknown as StreamlangStep);

describe('computePipelineDiff', () => {
  it('returns empty diff when both pipelines are empty', () => {
    const diff = computePipelineDiff([], []);
    expect(diff.changes).toEqual([]);
    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(0);
    expect(diff.unchanged_count).toBe(0);
  });

  it('marks every step `added` when existing is empty', () => {
    const proposed = [grokStep(), dateStep()];
    const diff = computePipelineDiff([], proposed);

    expect(diff.added_count).toBe(2);
    expect(diff.removed_count).toBe(0);
    expect(diff.unchanged_count).toBe(0);
    expect(diff.changes.map((c) => c.kind)).toEqual(['added', 'added']);
  });

  it('marks every step `removed` when proposed is empty', () => {
    const existing = [grokStep(), dateStep()];
    const diff = computePipelineDiff(existing, []);

    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(2);
    expect(diff.unchanged_count).toBe(0);
    expect(diff.changes.map((c) => c.kind)).toEqual(['removed', 'removed']);
  });

  it('treats structurally-identical steps as `unchanged` regardless of key order', () => {
    const existing = [grokStep()];
    // Same step but with keys inserted in a different order — canonical
    // signature must normalize this.
    const proposed: StreamlangStep[] = [
      {
        ignore_failure: true,
        patterns: ['%{IP:attributes.source.ip}'],
        from: 'body.text',
        action: 'grok',
      } as unknown as StreamlangStep,
    ];

    const diff = computePipelineDiff(existing, proposed);
    expect(diff.unchanged_count).toBe(1);
    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(0);
  });

  it('ignores `customIdentifier` differences when matching steps', () => {
    const existing = [grokStep({ customIdentifier: 'old-id-1' })];
    const proposed = [grokStep({ customIdentifier: 'fresh-id-after-retag' })];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(0);
  });

  it('flags structural mutations as one `removed` plus one `added`', () => {
    const existing = [grokStep({ patterns: ['%{IP:attributes.source.ip}'] })];
    const proposed = [grokStep({ patterns: ['%{IPV4:attributes.source.ip}'] })];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(0);
    expect(diff.added_count).toBe(1);
    expect(diff.removed_count).toBe(1);
  });

  it('classifies a mixed pipeline correctly', () => {
    const existing = [grokStep(), setStep('attributes.environment', 'prod')];
    // proposed: keep the grok, drop the set, add a date step
    const proposed = [grokStep(), dateStep()];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
    expect(diff.added_count).toBe(1);
    expect(diff.removed_count).toBe(1);
    const removed = diff.changes.find((c) => c.kind === 'removed')!;
    expect(removed.existing_index).toBe(1);
    expect(removed.proposed_index).toBeNull();
    const added = diff.changes.find((c) => c.kind === 'added')!;
    expect(added.proposed_index).toBe(1);
    expect(added.existing_index).toBeNull();
  });

  it('does not double-match when the same step appears multiple times', () => {
    const existing = [setStep('attributes.env', 'prod'), setStep('attributes.env', 'prod')];
    // Only one identical step in proposed — the second should be treated as removed.
    const proposed = [setStep('attributes.env', 'prod')];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
    expect(diff.removed_count).toBe(1);
    expect(diff.added_count).toBe(0);
  });

  it('matches condition blocks structurally including their nested steps', () => {
    const existing = [conditionStep([grokStep()])];
    const proposed = [conditionStep([grokStep()])];
    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
  });

  it('sees a condition block with a different nested step as removed + added', () => {
    const existing = [conditionStep([grokStep()])];
    const proposed = [conditionStep([dateStep()])];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.removed_count).toBe(1);
    expect(diff.added_count).toBe(1);
  });

  it('matches condition blocks whose nested steps differ only in key insertion order', () => {
    // Condition blocks must benefit from the same key-order normalization as
    // top-level steps — otherwise the LLM re-emitting an existing
    // conditional with a different key order would look like a removal +
    // addition and trigger spurious drop warnings.
    const existing = [conditionStep([grokStep()])];
    const proposed: StreamlangStep[] = [
      {
        condition: {
          // Inner step with keys re-ordered relative to `grokStep()`.
          steps: [
            {
              ignore_failure: true,
              patterns: ['%{IP:attributes.source.ip}'],
              from: 'body.text',
              action: 'grok',
            },
          ],
          eq: 'ERROR',
          field: 'severity_text',
        },
      } as unknown as StreamlangStep,
    ];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(0);
  });

  it('strips `customIdentifier` recursively from nested condition steps', () => {
    // `addDeterministicCustomIdentifiers` re-tags every step including
    // those inside condition blocks. The signature must ignore those tags
    // at every depth, not just the top level — otherwise a re-tag would
    // make every conditional look "modified" on every diff.
    const existing = [conditionStep([grokStep({ customIdentifier: 'old-nested-id' })])];
    const proposed = [conditionStep([grokStep({ customIdentifier: 'fresh-nested-id' })])];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(1);
    expect(diff.added_count).toBe(0);
    expect(diff.removed_count).toBe(0);
  });

  it('treats array order as semantically meaningful (grok pattern order matters)', () => {
    // Grok runs patterns in declared order and stops at the first match,
    // so reordering them changes runtime behaviour. A future "optimization"
    // that started sorting arrays in canonicalSignature would silently
    // hide that change from the user — this test guards against it.
    const existing = [
      grokStep({ patterns: ['%{IPV4:attributes.source.ip}', '%{IPV6:attributes.source.ip}'] }),
    ];
    const proposed = [
      grokStep({ patterns: ['%{IPV6:attributes.source.ip}', '%{IPV4:attributes.source.ip}'] }),
    ];

    const diff = computePipelineDiff(existing, proposed);

    expect(diff.unchanged_count).toBe(0);
    expect(diff.added_count).toBe(1);
    expect(diff.removed_count).toBe(1);
  });
});

describe('labelForStep', () => {
  it('renders "action on from → to" when both are present', () => {
    expect(labelForStep(dateStep())).toBe('date on attributes.custom.timestamp → @timestamp');
  });

  it('renders "action on from" for steps with only a source field', () => {
    expect(labelForStep(grokStep())).toBe('grok on body.text');
  });

  it('renders "action to to" when only `to` is present', () => {
    expect(labelForStep(setStep('attributes.environment', 'prod'))).toBe(
      'set to attributes.environment'
    );
  });

  it('falls back to the action name for shapes without `from`/`to`', () => {
    const exotic = { action: 'pipeline_break' } as unknown as StreamlangStep;
    expect(labelForStep(exotic)).toBe('pipeline_break');
  });

  it('renders condition blocks with the generic "step" label (no action key)', () => {
    // Condition blocks have no `action` field — the label fallback is
    // intentionally generic. We assert it explicitly so a regression in
    // `labelForStep` (e.g. throwing on missing `action`) would be caught.
    expect(labelForStep(conditionStep([grokStep()]))).toBe('step');
  });
});

describe('buildDropWarnings', () => {
  it('returns a warning for each removed step, 1-indexed by existing position', () => {
    const existing = [grokStep(), setStep('attributes.environment', 'prod'), dateStep()];
    const proposed = [grokStep()];
    const warnings = buildDropWarnings(computePipelineDiff(existing, proposed));

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('REMOVES the existing step #2');
    expect(warnings[0]).toContain('set to attributes.environment');
    expect(warnings[1]).toContain('REMOVES the existing step #3');
    expect(warnings[1]).toContain('date on attributes.custom.timestamp → @timestamp');
  });

  it('returns no warnings when nothing is removed', () => {
    const warnings = buildDropWarnings(computePipelineDiff([grokStep()], [grokStep(), dateStep()]));
    expect(warnings).toEqual([]);
  });

  it('warns about a removed condition block using the generic step label', () => {
    // Condition blocks are top-level steps too. When the LLM drops one,
    // the warning still needs to call out the position so the user can
    // verify the change rather than silently losing the conditional
    // logic.
    const warnings = buildDropWarnings(computePipelineDiff([conditionStep([grokStep()])], []));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('REMOVES the existing step #1');
    expect(warnings[0]).toContain('step');
  });
});
