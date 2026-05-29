/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import {
  buildDuplicationWarning,
  buildOverwriteWarning,
  buildPlacementWarning,
  getStepWriteTargets,
  isExtractionStepOnField,
  stepWritesOrRemovesField,
} from './extract_fields_warnings';

describe('isExtractionStepOnField', () => {
  it('returns true for grok on the given field', () => {
    expect(
      isExtractionStepOnField({ action: 'grok', from: 'body.text', patterns: ['x'] }, 'body.text')
    ).toBe(true);
  });

  it('returns true for dissect on the given field', () => {
    expect(
      isExtractionStepOnField({ action: 'dissect', from: 'body.text', pattern: 'x' }, 'body.text')
    ).toBe(true);
  });

  it('returns false for non-extraction actions on the same field', () => {
    expect(
      isExtractionStepOnField({ action: 'set', to: 'body.text', value: 'x' }, 'body.text')
    ).toBe(false);
    expect(isExtractionStepOnField({ action: 'remove', from: 'body.text' }, 'body.text')).toBe(
      false
    );
  });

  it('returns false for grok on a different field', () => {
    expect(
      isExtractionStepOnField({ action: 'grok', from: 'message', patterns: ['x'] }, 'body.text')
    ).toBe(false);
  });

  it('returns false for non-objects', () => {
    expect(isExtractionStepOnField(null, 'body.text')).toBe(false);
    expect(isExtractionStepOnField('grok', 'body.text')).toBe(false);
  });

  it('returns false for an empty condition block', () => {
    expect(
      isExtractionStepOnField(
        { condition: { field: 'severity_text', eq: 'ERROR', steps: [] } },
        'body.text'
      )
    ).toBe(false);
  });

  it('recurses into a condition block and detects a nested grok on the source field', () => {
    expect(
      isExtractionStepOnField(
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [{ action: 'grok', from: 'body.text', patterns: ['%{IP:client.ip}'] }],
          },
        },
        'body.text'
      )
    ).toBe(true);
  });

  it('recurses into a condition `else` branch and detects a nested dissect on the source field', () => {
    expect(
      isExtractionStepOnField(
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [{ action: 'set', to: 'attributes.priority', value: 'high' }],
            else: [{ action: 'dissect', from: 'body.text', pattern: '%{a} %{b}' }],
          },
        },
        'body.text'
      )
    ).toBe(true);
  });

  it('returns false when the nested step targets a different field', () => {
    expect(
      isExtractionStepOnField(
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [{ action: 'grok', from: 'message', patterns: ['%{IP:client.ip}'] }],
          },
        },
        'body.text'
      )
    ).toBe(false);
  });

  it('recurses through nested condition blocks', () => {
    expect(
      isExtractionStepOnField(
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [
              {
                condition: {
                  field: 'event.kind',
                  eq: 'event',
                  steps: [{ action: 'grok', from: 'body.text', patterns: ['%{NUMBER:n}'] }],
                },
              },
            ],
          },
        },
        'body.text'
      )
    ).toBe(true);
  });
});

describe('stepWritesOrRemovesField', () => {
  // body.text is the canonical seed source; anything that mutates it must
  // run AFTER the new extraction reads it, never before.
  const sourceField = 'body.text';
  // Test inputs are typed via `as unknown as StreamlangStep` so each case
  // can express the minimal shape it cares about — the helpers exhaustively
  // discriminate on `step.action`, so missing optional fields are fine.
  const step = (s: object) => s as unknown as StreamlangStep;

  it('detects a `set` writing to the source field', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'set', to: sourceField, value: 'redacted' }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `remove` against the source field', () => {
    expect(
      stepWritesOrRemovesField(step({ action: 'remove', from: sourceField }), sourceField)
    ).toBe(true);
  });

  it('detects `rename` away from the source field', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'rename', from: sourceField, to: 'attributes.original_message' }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `convert` writing back into the source field via `to`', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'convert', from: 'attributes.raw', to: sourceField, type: 'string' }),
        sourceField
      )
    ).toBe(true);
  });

  it('returns false for an unrelated `set`', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'set', to: 'attributes.environment', value: 'prod' }),
        sourceField
      )
    ).toBe(false);
  });

  it('returns false for grok reading the source field with no capture into it (read-only, safe to keep before)', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'grok', from: sourceField, patterns: ['%{IP:client.ip}'] }),
        sourceField
      )
    ).toBe(false);
  });

  it('detects `convert` writing back into the source field via implicit `to` (defaults to `from`)', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'convert', from: sourceField, type: 'string' }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `date` writing back into the source field via implicit `to` (defaults to `from`)', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'date', from: sourceField, formats: ['ISO8601'] }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `remove_by_prefix` covering the source field exactly', () => {
    expect(
      stepWritesOrRemovesField(step({ action: 'remove_by_prefix', from: sourceField }), sourceField)
    ).toBe(true);
  });

  it('detects `remove_by_prefix` covering the source field as a nested prefix', () => {
    expect(
      stepWritesOrRemovesField(step({ action: 'remove_by_prefix', from: 'body' }), sourceField)
    ).toBe(true);
  });

  it('detects `dissect` capturing back into the source field via `%{body.text}` syntax', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'dissect', from: 'attributes.raw', pattern: '%{a} %{body.text}' }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `grok` capturing back into the source field via `:body.text}` syntax', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'grok', from: 'attributes.raw', patterns: ['%{GREEDYDATA:body.text}'] }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects in-place text actions (`uppercase` / `lowercase` / `trim` / `replace`) writing the source field via implicit `to`', () => {
    for (const action of ['uppercase', 'lowercase', 'trim', 'replace'] as const) {
      const extras =
        action === 'replace'
          ? { pattern: '\\s+', replacement: ' ' }
          : ({} as Record<string, unknown>);
      expect(
        stepWritesOrRemovesField(step({ action, from: sourceField, ...extras }), sourceField)
      ).toBe(true);
    }
  });

  it('detects `redact` rewriting the source field in place', () => {
    expect(
      stepWritesOrRemovesField(
        step({ action: 'redact', from: sourceField, patterns: ['%{IP:ip}'] }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `json_extract` writing one of its `extractions` into the source field', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          action: 'json_extract',
          field: 'attributes.json',
          extractions: [
            { selector: '$.user', target_field: 'user.name' },
            { selector: '$.body', target_field: sourceField },
          ],
        }),
        sourceField
      )
    ).toBe(true);
  });

  it('detects `network_direction` writing to its `target_field` (and assumes worst-case when target_field is unset)', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          action: 'network_direction',
          source_ip: 'attributes.src',
          destination_ip: 'attributes.dst',
          target_field: sourceField,
          internal_networks: ['private'],
        }),
        sourceField
      )
    ).toBe(true);
    expect(
      stepWritesOrRemovesField(
        step({
          action: 'network_direction',
          source_ip: 'attributes.src',
          destination_ip: 'attributes.dst',
          internal_networks: ['private'],
        }),
        sourceField
      )
    ).toBe(true);
  });

  it('returns true for `manual_ingest_pipeline` (raw ES processors are opaque, must prepend defensively)', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          action: 'manual_ingest_pipeline',
          processors: [{ set: { field: 'x', value: 1 } }],
        }),
        sourceField
      )
    ).toBe(true);
  });

  it('returns false for `drop_document` (drops the doc entirely, orthogonal to placement)', () => {
    expect(stepWritesOrRemovesField(step({ action: 'drop_document' }), sourceField)).toBe(false);
  });

  it('recurses into condition blocks — detects a nested `set` writing the source field', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          condition: {
            field: 'attributes.kind',
            eq: 'pii',
            steps: [{ action: 'set', to: sourceField, value: 'redacted' }],
          },
        }),
        sourceField
      )
    ).toBe(true);
  });

  it('recurses into condition blocks — detects a write inside the `else` branch', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          condition: {
            field: 'attributes.kind',
            eq: 'safe',
            steps: [{ action: 'set', to: 'attributes.unrelated', value: 'x' }],
            else: [{ action: 'remove', from: sourceField }],
          },
        }),
        sourceField
      )
    ).toBe(true);
  });

  it('returns false for a condition block whose nested steps do not touch the source field', () => {
    expect(
      stepWritesOrRemovesField(
        step({
          condition: {
            field: 'attributes.kind',
            eq: 'safe',
            steps: [{ action: 'set', to: 'attributes.flag', value: true }],
          },
        }),
        sourceField
      )
    ).toBe(false);
  });
});

describe('getStepWriteTargets', () => {
  const step = (s: object) => s as unknown as StreamlangStep;

  it('returns the `to` field for `set` / `append`', () => {
    expect(
      getStepWriteTargets(step({ action: 'set', to: 'attributes.env', value: 'prod' }))
    ).toEqual(['attributes.env']);
    expect(
      getStepWriteTargets(step({ action: 'append', to: 'attributes.tags', value: ['x'] }))
    ).toEqual(['attributes.tags']);
  });

  it('returns the `to` field for `rename` (the destination, not the source)', () => {
    expect(
      getStepWriteTargets(step({ action: 'rename', from: 'attributes.a', to: 'attributes.b' }))
    ).toEqual(['attributes.b']);
  });

  it('returns the explicit `to` for `convert` / `date` when provided', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'convert',
          from: 'attributes.raw',
          to: 'attributes.converted',
          type: 'integer',
        })
      )
    ).toEqual(['attributes.converted']);
    expect(
      getStepWriteTargets(
        step({
          action: 'date',
          from: 'attributes.ts_str',
          to: '@timestamp',
          formats: ['ISO8601'],
        })
      )
    ).toEqual(['@timestamp']);
  });

  it('falls back to `from` for `convert` / `date` when `to` is omitted (in-place write)', () => {
    expect(
      getStepWriteTargets(step({ action: 'convert', from: 'attributes.raw', type: 'integer' }))
    ).toEqual(['attributes.raw']);
    expect(
      getStepWriteTargets(step({ action: 'date', from: '@timestamp', formats: ['ISO8601'] }))
    ).toEqual(['@timestamp']);
  });

  it('extracts named grok captures from a single pattern', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'grok',
          from: 'body.text',
          patterns: ['%{TIMESTAMP_ISO8601:@timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message}'],
        })
      )
    ).toEqual(['@timestamp', 'log.level', 'message']);
  });

  it('handles grok captures with type qualifiers (e.g. `%{NUMBER:port:int}`)', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'grok',
          from: 'body.text',
          patterns: ['%{NUMBER:port:int} %{IP:client.ip}'],
        })
      )
    ).toEqual(['port', 'client.ip']);
  });

  it('deduplicates targets across multiple grok patterns', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'grok',
          from: 'body.text',
          patterns: ['%{IP:client.ip}', '%{IP:client.ip} %{NUMBER:port}'],
        })
      )
    ).toEqual(['client.ip', 'port']);
  });

  it('extracts dissect captures and ignores modifier captures (`+`, `?`, `&`, `*`)', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'dissect',
          from: 'body.text',
          // `%{?ignored}` and `%{+continued}` produce no field of those names.
          pattern: '%{ts} %{?ignored} %{+continued} %{body}',
        })
      )
    ).toEqual(['ts', 'body']);
  });

  it('returns each `extractions[].target_field` for `json_extract`', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'json_extract',
          field: 'attributes.json',
          extractions: [
            { selector: '$.user', target_field: 'user.name' },
            { selector: '$.body', target_field: 'body.text' },
          ],
        })
      )
    ).toEqual(['user.name', 'body.text']);
  });

  it('returns the `target_field` for `network_direction`, or `[]` when omitted', () => {
    expect(
      getStepWriteTargets(
        step({
          action: 'network_direction',
          source_ip: 'a',
          destination_ip: 'b',
          target_field: 'network.direction',
          internal_networks: ['private'],
        })
      )
    ).toEqual(['network.direction']);
    expect(
      getStepWriteTargets(
        step({
          action: 'network_direction',
          source_ip: 'a',
          destination_ip: 'b',
          internal_networks: ['private'],
        })
      )
    ).toEqual([]);
  });

  it('returns `from` for in-place text actions (`uppercase` / `lowercase` / `trim` / `redact`) when `to` is omitted', () => {
    expect(getStepWriteTargets(step({ action: 'uppercase', from: 'attributes.x' }))).toEqual([
      'attributes.x',
    ]);
    expect(
      getStepWriteTargets(step({ action: 'redact', from: 'message', patterns: ['%{IP:ip}'] }))
    ).toEqual(['message']);
  });

  it('returns `[]` for read-only / doc-level / opaque actions', () => {
    expect(getStepWriteTargets(step({ action: 'remove', from: 'x' }))).toEqual([]);
    expect(getStepWriteTargets(step({ action: 'remove_by_prefix', from: 'x' }))).toEqual([]);
    expect(getStepWriteTargets(step({ action: 'drop_document' }))).toEqual([]);
    expect(getStepWriteTargets(step({ action: 'manual_ingest_pipeline', processors: [] }))).toEqual(
      []
    );
  });

  it("unions write targets from a condition block's nested steps and `else` branch", () => {
    expect(
      getStepWriteTargets(
        step({
          condition: {
            field: 'attributes.kind',
            eq: 'pii',
            steps: [{ action: 'set', to: 'attributes.redacted', value: true }],
            else: [{ action: 'set', to: 'attributes.kept', value: true }],
          },
        })
      ).sort()
    ).toEqual(['attributes.kept', 'attributes.redacted']);
  });
});

describe('buildPlacementWarning', () => {
  const stepList = (steps: object[]) => steps as unknown as StreamlangStep[];

  it('returns null when there are no existing steps (placement is vacuous)', () => {
    expect(
      buildPlacementWarning({
        existingSteps: [],
        sourceFieldUsedByExisting: false,
        fieldName: 'body.text',
      })
    ).toBeNull();
  });

  it('reports BEFORE-placement when an existing step touches the source field', () => {
    const warning = buildPlacementWarning({
      existingSteps: stepList([
        { action: 'set', to: 'attributes.env', value: 'prod' },
        { action: 'set', to: 'body.text', value: 'replaced' },
      ]),
      sourceFieldUsedByExisting: true,
      fieldName: 'body.text',
    });
    expect(warning).not.toBeNull();
    expect(warning).toContain('placed BEFORE the 2 existing step(s)');
    expect(warning).toContain('"body.text"');
    expect(warning).toContain('Review that the new extraction does not duplicate');
  });

  it('reports appended placement when no existing step touches the source field', () => {
    const warning = buildPlacementWarning({
      existingSteps: stepList([{ action: 'set', to: 'attributes.env', value: 'prod' }]),
      sourceFieldUsedByExisting: false,
      fieldName: 'body.text',
    });
    expect(warning).not.toBeNull();
    expect(warning).toContain('1 existing step(s) kept their original position');
    expect(warning).toContain('appended at the end');
  });
});

describe('buildDuplicationWarning', () => {
  const stepList = (steps: object[]) => steps as unknown as StreamlangStep[];

  it('returns null when no existing step extracts from the same field', () => {
    expect(
      buildDuplicationWarning({
        existingSteps: stepList([{ action: 'set', to: 'attributes.env', value: 'prod' }]),
        fieldName: 'body.text',
      })
    ).toBeNull();
  });

  it('returns null when an existing extraction targets a different field', () => {
    expect(
      buildDuplicationWarning({
        existingSteps: stepList([
          { action: 'grok', from: 'attributes.raw', patterns: ['%{IP:client.ip}'] },
        ]),
        fieldName: 'body.text',
      })
    ).toBeNull();
  });

  it('flags a top-level grok duplicate with the action label', () => {
    const warning = buildDuplicationWarning({
      existingSteps: stepList([
        { action: 'grok', from: 'body.text', patterns: ['%{IP:client.ip}'] },
      ]),
      fieldName: 'body.text',
    });
    expect(warning).not.toBeNull();
    expect(warning).toContain('"body.text"');
    expect(warning).toContain('(grok)');
    expect(warning).toContain('may duplicate work');
  });

  it('flags a top-level dissect duplicate with the action label', () => {
    const warning = buildDuplicationWarning({
      existingSteps: stepList([{ action: 'dissect', from: 'body.text', pattern: '%{ts} %{msg}' }]),
      fieldName: 'body.text',
    });
    expect(warning).not.toBeNull();
    expect(warning).toContain('(dissect)');
  });

  it('marks a duplicate nested inside a condition block as such', () => {
    const warning = buildDuplicationWarning({
      existingSteps: stepList([
        {
          condition: {
            field: 'log.level',
            eq: 'error',
            steps: [{ action: 'grok', from: 'body.text', patterns: ['%{IP:client.ip}'] }],
          },
        },
      ]),
      fieldName: 'body.text',
    });
    expect(warning).not.toBeNull();
    expect(warning).toContain('(inside a condition block)');
  });
});

describe('buildOverwriteWarning', () => {
  const stepList = (steps: object[]) => steps as unknown as StreamlangStep[];

  it('returns null when no fields were created', () => {
    expect(
      buildOverwriteWarning(stepList([{ action: 'set', to: 'attributes.env', value: 'prod' }]), [
        { field: 'foo', change: 'modified' },
      ])
    ).toBeNull();
  });

  it('returns null when no existing step writes to a created field', () => {
    expect(
      buildOverwriteWarning(stepList([{ action: 'set', to: 'attributes.env', value: 'prod' }]), [
        { field: 'attributes.timestamp', change: 'created' },
      ])
    ).toBeNull();
  });

  it('warns when a `set` overlaps a created field', () => {
    const warning = buildOverwriteWarning(
      stepList([{ action: 'set', to: 'attributes.timestamp', value: '2020-01-01' }]),
      [{ field: 'attributes.timestamp', change: 'created' }]
    );
    expect(warning).not.toBeNull();
    expect(warning).toContain('"attributes.timestamp"');
    expect(warning).toContain('overwrite the other');
  });

  it('warns when an existing grok captures into a field the new extraction also creates', () => {
    const warning = buildOverwriteWarning(
      stepList([
        {
          action: 'grok',
          from: 'attributes.raw',
          patterns: ['%{IP:client.ip}'],
        },
      ]),
      [
        { field: 'client.ip', change: 'created' },
        { field: 'log.level', change: 'created' },
      ]
    );
    expect(warning).not.toBeNull();
    expect(warning).toContain('"client.ip"');
    expect(warning).not.toContain('"log.level"');
  });

  it('lists all overlapping fields when multiple existing steps clash', () => {
    const warning = buildOverwriteWarning(
      stepList([
        { action: 'set', to: 'attributes.env', value: 'prod' },
        { action: 'rename', from: 'attributes.x', to: 'attributes.host' },
      ]),
      [
        { field: 'attributes.env', change: 'created' },
        { field: 'attributes.host', change: 'created' },
        { field: 'attributes.unrelated', change: 'created' },
      ]
    );
    expect(warning).not.toBeNull();
    expect(warning).toContain('"attributes.env"');
    expect(warning).toContain('"attributes.host"');
    expect(warning).not.toContain('"attributes.unrelated"');
  });
});
