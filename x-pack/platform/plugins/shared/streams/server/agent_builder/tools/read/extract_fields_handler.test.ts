/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { GrokProcessor, StreamlangStep } from '@kbn/streamlang';

// These mocks must be declared before the import below — `jest.mock` is
// hoisted, but the local references must come from `require(...)` once
// the module has been registered.
jest.mock('@kbn/streams-ai', () => ({
  suggestProcessingPipeline: jest.fn(),
  mergeSeedParsingProcessorIntoSuggestedPipeline: jest.fn(),
  buildDocumentStructureOverviewForPipelinePrompt: jest.fn(),
  formatUpstreamSeedParsingContextForPromptMarkdown: jest.fn(),
  fetchMappedFieldsForStreamProcessingSuggestions: jest.fn(),
  postParsePipelineDefinitionSchema: {},
}));

jest.mock('../../../routes/internal/streams/processing/simulation_handler', () => ({
  simulateProcessing: jest.fn(),
}));

jest.mock('../../../routes/internal/streams/management/seed_parsing_helpers', () => ({
  processGrokPatterns: jest.fn(),
  processDissectPattern: jest.fn(),
  extractParsedSampleDocuments: jest.fn(),
  formatInferenceErrorMeta: jest.fn().mockReturnValue(''),
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

// Older jest jsdom envs don't ship `AbortSignal.timeout`, but the
// `runExtractFieldsFlow` handler relies on it to compose an operation
// timeout signal with the caller-supplied request signal. Polyfill it
// locally so tests can exercise the full handler path without hitting
// "AbortSignal.timeout is not a function".
beforeAll(() => {
  if (typeof AbortSignal.timeout !== 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AbortSignal as any).timeout = (ms: number) => {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(new Error(`Timeout after ${ms}ms`)), ms).unref?.();
      return ctrl.signal;
    };
  }
});

import {
  buildKeyValueHints,
  buildOverwriteWarning,
  computeKvMinSamples,
  getStepWriteTargets,
  isBlockedKvField,
  isExtractionStepOnField,
  runExtractFieldsFlow,
  stepWritesOrRemovesField,
  type RunExtractFieldsDeps,
} from './extract_fields_handler';
import {
  suggestProcessingPipeline,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  buildDocumentStructureOverviewForPipelinePrompt,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  fetchMappedFieldsForStreamProcessingSuggestions,
} from '@kbn/streams-ai';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import {
  processGrokPatterns,
  processDissectPattern,
  extractParsedSampleDocuments,
} from '../../../routes/internal/streams/management/seed_parsing_helpers';

const mockSuggestProcessingPipeline = suggestProcessingPipeline as jest.MockedFunction<
  typeof suggestProcessingPipeline
>;
const mockMergeSeedParsingProcessorIntoSuggestedPipeline =
  mergeSeedParsingProcessorIntoSuggestedPipeline as jest.MockedFunction<
    typeof mergeSeedParsingProcessorIntoSuggestedPipeline
  >;
const mockBuildDocumentStructureOverviewForPipelinePrompt =
  buildDocumentStructureOverviewForPipelinePrompt as jest.MockedFunction<
    typeof buildDocumentStructureOverviewForPipelinePrompt
  >;
const mockFormatUpstreamSeedParsingContextForPromptMarkdown =
  formatUpstreamSeedParsingContextForPromptMarkdown as jest.MockedFunction<
    typeof formatUpstreamSeedParsingContextForPromptMarkdown
  >;
const mockFetchMappedFieldsForStreamProcessingSuggestions =
  fetchMappedFieldsForStreamProcessingSuggestions as jest.MockedFunction<
    typeof fetchMappedFieldsForStreamProcessingSuggestions
  >;
const mockSimulateProcessing = simulateProcessing as jest.MockedFunction<typeof simulateProcessing>;
const mockProcessGrokPatterns = processGrokPatterns as jest.MockedFunction<
  typeof processGrokPatterns
>;
const mockProcessDissectPattern = processDissectPattern as jest.MockedFunction<
  typeof processDissectPattern
>;
const mockExtractParsedSampleDocuments = extractParsedSampleDocuments as jest.MockedFunction<
  typeof extractParsedSampleDocuments
>;

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

describe('isBlockedKvField', () => {
  // The KV hint generator must skip fields whose values legitimately contain
  // `=` for reasons unrelated to a refinable `prefix=value` shape — URL
  // query strings, HTTP/Kafka header values, free-text messages, etc.
  // False positives here mean the agent suggests a destructive refinement
  // against real data; false negatives just miss a useful hint.

  it('matches the canonical universal fields', () => {
    expect(isBlockedKvField('@timestamp')).toBe(true);
    expect(isBlockedKvField('stream.name')).toBe(true);
    expect(isBlockedKvField('message')).toBe(true);
    expect(isBlockedKvField('body.text')).toBe(true);
  });

  it('matches OTel structured-body and original-message fields', () => {
    expect(isBlockedKvField('body.structured.message')).toBe(true);
    expect(isBlockedKvField('attributes.original_message')).toBe(true);
  });

  it('matches URL-shaped fields at any nesting depth', () => {
    expect(isBlockedKvField('url.path')).toBe(true);
    expect(isBlockedKvField('url.full')).toBe(true);
    expect(isBlockedKvField('url.original')).toBe(true);
    expect(isBlockedKvField('url.query')).toBe(true);
    expect(isBlockedKvField('attributes.url.path')).toBe(true);
    expect(isBlockedKvField('resource.attributes.http.url.full')).toBe(true);
  });

  it('matches headers fields under any common namespace', () => {
    expect(isBlockedKvField('attributes.headers.cookie')).toBe(true);
    expect(isBlockedKvField('attributes.headers.authorization')).toBe(true);
    expect(isBlockedKvField('headers.x-request-id')).toBe(true);
  });

  it('matches host attribute fields', () => {
    expect(isBlockedKvField('host.name')).toBe(true);
    expect(isBlockedKvField('resource.attributes.host.name')).toBe(true);
    expect(isBlockedKvField('resource.attributes.host.id')).toBe(true);
  });

  it('does NOT match unrelated ID-shaped fields', () => {
    expect(isBlockedKvField('attributes.user.id')).toBe(false);
    expect(isBlockedKvField('attributes.session.id')).toBe(false);
    expect(isBlockedKvField('resource.attributes.service.name')).toBe(false);
  });

  it('does NOT match fields whose name merely contains "url" as a substring', () => {
    // Guard against an over-broad suffix match: `attributes.curlVersion`
    // ends with `url` lexically but is not a URL field.
    expect(isBlockedKvField('attributes.curlVersion')).toBe(false);
    expect(isBlockedKvField('attributes.urlencoded')).toBe(false);
  });

  it('does NOT match fields whose name merely starts with "host" or "headers"', () => {
    // Prefix matchers all include a trailing dot so `hostname` and
    // `headersize` are safe.
    expect(isBlockedKvField('hostname')).toBe(false);
    expect(isBlockedKvField('headersize')).toBe(false);
  });
});

describe('computeKvMinSamples', () => {
  // Adaptive minimum-samples threshold for the KV hint generator. Lets
  // sparse streams (few parsed docs) still get hints, with a hard floor
  // below which "100% agreement" is too easily coincidental.

  it('returns the preferred minimum when there are plenty of parsed documents', () => {
    expect(computeKvMinSamples(100)).toBe(5);
    expect(computeKvMinSamples(5)).toBe(5);
  });

  it('scales the threshold down for small populations but never below the floor', () => {
    expect(computeKvMinSamples(4)).toBe(4);
    expect(computeKvMinSamples(3)).toBe(3);
  });

  it('stays at the floor when the parsed-document count drops below the floor', () => {
    expect(computeKvMinSamples(2)).toBe(3);
    expect(computeKvMinSamples(1)).toBe(3);
    expect(computeKvMinSamples(0)).toBe(3);
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

describe('buildKeyValueHints', () => {
  // The hint generator only flags fields where every populated sample value
  // shares an identical `prefix=` shape, since false positives lead the agent
  // to suggest unwanted refinements.
  const docs = (...rows: Array<Record<string, unknown>>): FlattenRecord[] =>
    rows as FlattenRecord[];

  it('returns no hints when fewer than KV_MIN_SAMPLES populated values exist in a large population', () => {
    // With 6 parsed docs the effective threshold is the full
    // KV_MIN_SAMPLES (5). Only 4 populate the captured field → not
    // enough signal.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.other.field': 'unrelated' },
        { 'attributes.other.field': 'unrelated' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('emits a hint when every sample value shares the same `prefix=` shape', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.user.id': 'user=u-5' }
      )
    );

    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('attributes.user.id');
    expect(hints[0]).toContain('user=');

    expect(hints[0]).toContain('refine_extracted_field');
    expect(hints[0]).toContain('action: "drop_prefix"');
    expect(hints[0]).toContain('prefix: "user"');

    expect(hints[0]).toContain('pipeline_steps');
  });

  it('does NOT emit a hint when only some values carry the prefix', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'plain-value' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.user.id': 'user=u-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('does NOT emit a hint when prefixes differ between samples', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.id': 'user=u-1' },
        { 'attributes.id': 'service=auth' },
        { 'attributes.id': 'user=u-3' },
        { 'attributes.id': 'service=catalog' },
        { 'attributes.id': 'user=u-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('skips system fields on the blocklist (body.text, message, @timestamp, stream.name)', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'body.text': 'user=u-1', message: 'service=auth' },
        { 'body.text': 'user=u-2', message: 'service=auth' },
        { 'body.text': 'user=u-3', message: 'service=auth' },
        { 'body.text': 'user=u-4', message: 'service=auth' },
        { 'body.text': 'user=u-5', message: 'service=auth' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('skips URL paths even when every value contains `=` (query-string false positives)', () => {
    // attributes.url.path values can legitimately contain `=` as part of
    // path matrix params or URL-encoded fragments — suggesting a prefix
    // strip would destroy real data.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.url.path': '/api/users;jsessionid=abc' },
        { 'attributes.url.path': '/api/users;jsessionid=def' },
        { 'attributes.url.path': '/api/users;jsessionid=ghi' },
        { 'attributes.url.path': '/api/users;jsessionid=jkl' },
        { 'attributes.url.path': '/api/users;jsessionid=mno' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('skips headers fields even when every value shares a prefix', () => {
    // attributes.headers.cookie typically contains `name=value` shapes
    // that are meaningful as-is.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.headers.cookie': 'session=s-1' },
        { 'attributes.headers.cookie': 'session=s-2' },
        { 'attributes.headers.cookie': 'session=s-3' },
        { 'attributes.headers.cookie': 'session=s-4' },
        { 'attributes.headers.cookie': 'session=s-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('skips host attribute fields', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'resource.attributes.host.name': 'host=h-1' },
        { 'resource.attributes.host.name': 'host=h-2' },
        { 'resource.attributes.host.name': 'host=h-3' },
        { 'resource.attributes.host.name': 'host=h-4' },
        { 'resource.attributes.host.name': 'host=h-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('emits a hint for a small parsed-document population (3 docs) when every value agrees', () => {
    // The adaptive threshold lets sparse streams still benefit from
    // refinement hints — 3 docs, all agreeing on the same `user=` prefix,
    // is the minimum signal that's still trustworthy.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' }
      )
    );
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('attributes.user.id');
  });

  it('does NOT emit a hint for a parsed-document population below the absolute floor', () => {
    // 2 docs is below KV_MIN_SAMPLES_FLOOR — even unanimous agreement is
    // too easily coincidental to surface.
    const hints = buildKeyValueHints(
      docs({ 'attributes.user.id': 'user=u-1' }, { 'attributes.user.id': 'user=u-2' })
    );
    expect(hints).toEqual([]);
  });

  it('still requires every populated value to agree for a small population', () => {
    // 3 docs is at the floor, but only 2 of them populate the field — the
    // generator should treat that as insufficient signal.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.other.field': 'unrelated' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('emits a separate hint per qualifying field', () => {
    const sample = (i: number) => ({
      'attributes.user.id': `user=u-${i}`,
      'resource.attributes.service.name': `service=svc-${i}`,
    });
    const hints = buildKeyValueHints(docs(sample(1), sample(2), sample(3), sample(4), sample(5)));

    expect(hints).toHaveLength(2);
    expect(hints.some((h) => h.includes('attributes.user.id') && h.includes('user='))).toBe(true);
    expect(
      hints.some((h) => h.includes('resource.attributes.service.name') && h.includes('service='))
    ).toBe(true);
  });

  describe('survivingFields scoping', () => {
    const fiveSamples = (fieldName: string, prefix: string) =>
      docs(
        { [fieldName]: `${prefix}=v1` },
        { [fieldName]: `${prefix}=v2` },
        { [fieldName]: `${prefix}=v3` },
        { [fieldName]: `${prefix}=v4` },
        { [fieldName]: `${prefix}=v5` }
      );

    it('skips a field that does not survive into the final pipeline', () => {
      const survivingFields = new Set(['user.id']);
      const hints = buildKeyValueHints(fiveSamples('attributes.user.id', 'user'), survivingFields);

      expect(hints).toEqual([]);
    });

    it('emits the hint for a field that does survive into the final pipeline', () => {
      const survivingFields = new Set(['attributes.user.id']);
      const hints = buildKeyValueHints(fiveSamples('attributes.user.id', 'user'), survivingFields);

      expect(hints).toHaveLength(1);
      expect(hints[0]).toContain('attributes.user.id');
    });

    it('treats an empty surviving set as "nothing survives" and emits no hints', () => {
      // Defensive: the post-parse sub-agent could in principle wipe every
      // captured field. The filter must NOT degrade silently to "no
      // filter" in that case — an empty set means "no field qualifies".
      const hints = buildKeyValueHints(fiveSamples('attributes.user.id', 'user'), new Set());

      expect(hints).toEqual([]);
    });

    it('falls back to today unscoped behaviour when survivingFields is omitted', () => {
      // Unit tests for the extraction logic (and any future caller that
      // legitimately doesn\'t have a surviving-field set) must keep
      // working. Passing `undefined` opts out of the filter.
      const hints = buildKeyValueHints(fiveSamples('attributes.user.id', 'user'));

      expect(hints).toHaveLength(1);
    });
  });
});

describe('runExtractFieldsFlow', () => {
  // Builds a minimal dep set that lets the function reach the
  // `Streams.ingest.all.Definition.is` early return without any extraction
  // workers, inference clients, or telemetry being touched. Each test
  // overrides `streamsClient.getStream` to control the path under test.
  const buildDeps = (overrides: Partial<RunExtractFieldsDeps> = {}): RunExtractFieldsDeps => {
    const noopLogger = {
      get: () => noopLogger,
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn(),
      isLevelEnabled: () => true,
    } as unknown as RunExtractFieldsDeps['logger'];

    return {
      streamsClient: {
        getStream: jest.fn(),
      } as unknown as RunExtractFieldsDeps['streamsClient'],
      scopedClusterClient: {
        asCurrentUser: { search: jest.fn() },
      } as unknown as RunExtractFieldsDeps['scopedClusterClient'],
      inferenceClient: {} as RunExtractFieldsDeps['inferenceClient'],
      boundInferenceClient: {} as RunExtractFieldsDeps['boundInferenceClient'],
      connectorId: 'test-connector',
      fieldsMetadataClient: {} as RunExtractFieldsDeps['fieldsMetadataClient'],
      patternExtractionService: {} as RunExtractFieldsDeps['patternExtractionService'],
      logger: noopLogger,
      ...overrides,
    };
  };

  it('returns `unsupported` for a non-ingest stream (e.g. query stream)', async () => {
    const deps = buildDeps();
    // Query streams have `type: 'query'` and fail
    // `Streams.ingest.all.Definition.is`. They need a graceful fallback rather
    // than an opaque error so the agent can surface the reason.
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      name: 'logs.errors-view',
      type: 'query',
      query: { view: 'logs.errors-view', esql: 'FROM logs* | WHERE log.level == "error"' },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.errors-view' }, deps);

    expect(outcome.kind).toBe('unsupported');
    if (outcome.kind === 'unsupported') {
      expect(outcome.result.steps).toEqual([]);
      expect(outcome.result.warnings).toContainEqual(
        expect.stringContaining('extract_fields is only supported for ingest streams')
      );
      expect(outcome.result.simulation.success_rate).toBeNull();
      // streamType is surfaced on every outcome so the outer `design_pipeline`
      // handler can emit telemetry without a second `getStream` round-trip.
      expect(outcome.streamType).toBe('query');
    }
  });

  it('returns `fallback` with reason `no_samples` when sample resolution yields no documents', async () => {
    const deps = buildDeps();
    // Wired ingest stream with a valid definition but the index is empty.
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      type: 'wired',
      name: 'logs.test_unstructured',
      description: 'Empty stream',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });
    (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.test_unstructured' }, deps);

    expect(outcome.kind).toBe('fallback');
    if (outcome.kind === 'fallback') {
      expect(outcome.reason).toBe('no_samples');
    }
  });

  it('returns `fallback` with reason `no_text_field` when samples have no parseable text field', async () => {
    const deps = buildDeps();
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      type: 'wired',
      name: 'logs.test_structured',
      description: 'Structured stream',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });
    // Documents are already structured — no `body.text` or `message` for the
    // heuristic to seed-parse from.
    (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          { _source: { '@timestamp': '2026-04-16T00:00:00Z', 'service.name': 'auth' } },
          { _source: { '@timestamp': '2026-04-16T00:01:00Z', 'service.name': 'auth' } },
        ],
      },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.test_structured' }, deps);

    expect(outcome.kind).toBe('fallback');
    if (outcome.kind === 'fallback') {
      expect(outcome.reason).toBe('no_text_field');
    }
  });

  // ---------------------------------------------------------------------
  // Success / late-fallback paths
  //
  // These tests exercise the orchestration that runs after both
  // `body.text` discovery and `extractMessagesFromField` succeed: parallel
  // grok+dissect candidate selection, post-parse sub-agent design, merge
  // placement (append vs prepend), conflict warnings, drop warnings, and
  // telemetry.
  // ---------------------------------------------------------------------
  describe('after extraction starts', () => {
    const ingestStreamName = 'logs.unstructured';

    const buildIngestStreamDef = (
      processingSteps: StreamlangStep[] = []
    ): {
      type: 'wired';
      name: string;
      description: string;
      ingest: {
        wired: { fields: Record<string, never>; routing: never[] };
        processing: { steps: StreamlangStep[] };
        lifecycle: { inherit: {} };
        failure_store: { inherit: {} };
        settings: {};
      };
    } => ({
      type: 'wired',
      name: ingestStreamName,
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: processingSteps },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });

    const sampleSearchResponse = {
      hits: {
        hits: [
          { _source: { 'body.text': '192.168.1.1 GET / 200', 'service.name': 'web' } },
          { _source: { 'body.text': '10.0.0.1 POST /login 401', 'service.name': 'web' } },
        ],
      },
    };

    const grokCandidateProcessor: GrokProcessor = {
      action: 'grok',
      from: 'body.text',
      patterns: [
        '%{IP:attributes.source.ip} %{WORD:attributes.method} %{URIPATHPARAM:attributes.path} %{NUMBER:attributes.status}',
      ],
    } as unknown as GrokProcessor;

    const succeededSimulation = (
      overrides: Partial<ProcessingSimulationResponse> = {}
    ): ProcessingSimulationResponse =>
      ({
        detected_fields: [{ name: 'attributes.source.ip', esType: 'ip' }],
        documents: [
          {
            detected_fields: [],
            errors: [],
            status: 'parsed',
            processed_by: [],
            value: { 'attributes.source.ip': '192.168.1.1' },
          },
        ],
        processors_metrics: {},
        definition_error: undefined,
        documents_metrics: {
          failed_rate: 0,
          partially_parsed_rate: 0,
          skipped_rate: 0,
          parsed_rate: 1,
          dropped_rate: 0,
        },
        ...overrides,
      } as ProcessingSimulationResponse);

    beforeEach(() => {
      mockProcessGrokPatterns.mockReset();
      mockProcessDissectPattern.mockReset();
      mockExtractParsedSampleDocuments.mockReset();
      mockSuggestProcessingPipeline.mockReset();
      mockMergeSeedParsingProcessorIntoSuggestedPipeline.mockReset();
      mockBuildDocumentStructureOverviewForPipelinePrompt.mockReset();
      mockFormatUpstreamSeedParsingContextForPromptMarkdown.mockReset();
      mockFetchMappedFieldsForStreamProcessingSuggestions.mockReset();
      mockSimulateProcessing.mockReset();

      // Sensible defaults — individual tests override what they care about.
      mockBuildDocumentStructureOverviewForPipelinePrompt.mockResolvedValue({} as never);
      mockFormatUpstreamSeedParsingContextForPromptMarkdown.mockReturnValue('seed context');
      mockFetchMappedFieldsForStreamProcessingSuggestions.mockResolvedValue({});
      mockMergeSeedParsingProcessorIntoSuggestedPipeline.mockImplementation(
        (seedProcessor, agentSuggestion) =>
          ({
            steps: [seedProcessor as unknown as StreamlangStep, ...agentSuggestion.steps],
          } as never)
      );
    });

    const arrangeStreamWithSamples = (
      deps: RunExtractFieldsDeps,
      processingSteps: StreamlangStep[] = []
    ) => {
      (deps.streamsClient.getStream as jest.Mock).mockResolvedValue(
        buildIngestStreamDef(processingSteps)
      );
      (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue(
        sampleSearchResponse
      );
    };

    it('returns `fallback` with reason `no_candidate` when both grok and dissect produce nothing', async () => {
      // Both heuristics returning `null` is the "we tried, nothing useful
      // came back" signal — extract_fields cannot proceed without a seed
      // pattern, so the tool falls back to LLM-only design.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue(null);
      mockProcessDissectPattern.mockResolvedValue(null);

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_candidate');
        // streamType is forwarded so the outer handler can emit telemetry
        // with the right `stream_type` even on the fallback path.
        expect(outcome.streamType).toBe('wired');
      }
    });

    it('returns `fallback` with reason `no_parsed_documents` when seed simulation produces no parsed docs', async () => {
      // The chosen seed pattern compiled fine, but applied against the
      // sample documents it parsed nothing. Continuing into the post-parse
      // sub-agent would feed the LLM zero fully-parsed samples — falling
      // back is correct.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [],
        definitionError: false,
      });

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_parsed_documents');
      }
    });

    it('returns `fallback` with reason `no_parsed_documents` when seed simulation reports a definition error', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [],
        definitionError: true,
      });

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_parsed_documents');
      }
    });

    it('picks the highest `parsedRate` candidate when both grok and dissect succeed', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      const dissectProcessor = {
        action: 'dissect',
        from: 'body.text',
        pattern: '%{ip} %{rest}',
      } as unknown as StreamlangStep;
      // Dissect has the higher rate — it must win.
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.4,
      });
      mockProcessDissectPattern.mockResolvedValue({
        type: 'dissect',
        processor: dissectProcessor as never,
        parsedRate: 0.9,
      });
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      // The processor passed into `extractParsedSampleDocuments` is the
      // winning candidate. Asserting on `parsingProcessor` lets us
      // verify the sort ran on `parsedRate` (descending).
      expect(mockExtractParsedSampleDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ parsingProcessor: dissectProcessor })
      );
    });

    it('returns `success` with appended new extraction when no existing step touches the source field', async () => {
      // Existing steps decorate `attributes.environment` and don't touch
      // `body.text` — so it's safe to keep them at their original position
      // and append the discovered grok/dissect at the end.
      const harmlessExistingStep = {
        action: 'set',
        to: 'attributes.environment',
        value: 'prod',
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [harmlessExistingStep]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: {
          steps: [
            {
              action: 'date',
              from: 'attributes.timestamp',
              to: '@timestamp',
              formats: ['ISO8601'],
            } as unknown as StreamlangStep,
          ],
        },
        metadata: { stepsUsed: 3, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        // Existing step kept at index 0, new extraction (seed grok + agent
        // suggestion) appended after.
        const firstStep = outcome.result.steps[0] as { action?: string; to?: string };
        expect(firstStep.action).toBe('set');
        expect(firstStep.to).toBe('attributes.environment');
        // existing_steps is the pre-existing pipeline, unchanged.
        expect(outcome.result.existing_steps).toHaveLength(1);
        // Placement warning explicitly says the existing step kept its
        // original position so the user can verify nothing was reordered.
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('kept their original position')])
        );
        // Telemetry-relevant metadata is exposed on the outcome so the
        // outer `design_pipeline` handler can emit a single event covering
        // both this flow and the LLM-only fallback path.
        expect(outcome.streamType).toBe('wired');
        expect(outcome.stepsUsed).toBe(3);
      }
    });

    it('preserves an existing step with `ignore_failure: false` end-to-end without flipping it to true', async () => {
      const userConfiguredFailLoudly = {
        action: 'set',
        to: 'attributes.environment',
        value: 'staging',
        ignore_failure: false,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [userConfiguredFailLoudly]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind !== 'success') return;

      // Find the existing `set` step in the proposal — it may sit at any
      // position depending on the merge strategy, but its
      // `ignore_failure: false` MUST round-trip exactly as the user set it.
      const preservedSet = outcome.result.steps.find(
        (step) =>
          (step as { action?: string }).action === 'set' &&
          (step as { to?: string }).to === 'attributes.environment'
      ) as { action?: string; to?: string; value?: string; ignore_failure?: boolean } | undefined;

      expect(preservedSet).toBeDefined();
      expect(preservedSet?.ignore_failure).toBe(false);
      expect(preservedSet?.value).toBe('staging');

      // Newly-added grok still gets the safety default `ignore_failure: true`,
      // so we know the preservation is targeted, not blanket.
      const newGrok = outcome.result.steps.find(
        (step) => (step as { action?: string }).action === 'grok'
      ) as { ignore_failure?: boolean } | undefined;
      expect(newGrok?.ignore_failure).toBe(true);
    });

    it('returns `success` and PREPENDS new extraction when an existing step writes to the source field', async () => {
      // The existing `set` writes back into `body.text` BEFORE the new
      // grok would run — letting the existing step keep its position
      // would mutate the source the heuristic extracts from. The merge
      // logic must detect this and place new extraction first.
      const writesBodyText = {
        action: 'set',
        to: 'body.text',
        value: 'redacted',
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [writesBodyText]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        // First step in the merged pipeline is the seed grok, NOT the
        // pre-existing `set` — extraction runs first now.
        const firstStep = outcome.result.steps[0] as { action?: string };
        expect(firstStep.action).toBe('grok');
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('New extraction was placed BEFORE')])
        );
      }
    });

    it('emits a duplication warning when an existing step already extracts from the same field', async () => {
      // The user already has a grok against `body.text`. The new
      // extraction may produce overlapping captures — the agent must
      // surface this so the user confirms before applying.
      const existingGrok = {
        action: 'grok',
        from: 'body.text',
        patterns: ['%{IP:attributes.original_ip}'],
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [existingGrok]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('already extracts from field "body.text"'),
          ])
        );
      }
    });

    it('warns when an existing step writes to a field the new extraction also creates', async () => {
      const existingSet = {
        action: 'set',
        to: 'attributes.source.ip',
        value: '0.0.0.0',
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [existingSet]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 1,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind !== 'success') return;

      expect(outcome.result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /Existing step\(s\) write to field\(s\) "attributes\.source\.ip" that the new extraction also produces/
          ),
        ])
      );
    });

    it('surfaces simulation errors as a warning with the success rate prefix', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      // Simulation reports half the docs failed with a known error.
      mockSimulateProcessing.mockResolvedValue(
        succeededSimulation({
          documents: [
            {
              detected_fields: [],
              errors: [],
              status: 'parsed',
              processed_by: [],
              value: { 'attributes.source.ip': '1.2.3.4' },
            },
            {
              detected_fields: [],
              errors: [
                {
                  type: 'generic_processor_failure',
                  processor_id: 'p1',
                  message: 'grok pattern did not match',
                },
              ],
              status: 'failed',
              processed_by: [],
              value: {},
            },
          ],
          documents_metrics: {
            failed_rate: 0.5,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            parsed_rate: 0.5,
            dropped_rate: 0,
          },
        })
      );

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.simulation.success_rate).toBe(50);
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('50% success rate with 1 error type(s)')])
        );
      }
    });

    it('treats a definition error in the final simulation as null success_rate with the message surfaced', async () => {
      // A definition error means the proposed pipeline could not be
      // compiled at all — no per-doc success rate is meaningful.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(
        succeededSimulation({
          definition_error: {
            type: 'generic_simulation_failure',
            message: 'reserved field cannot be written',
          },
          documents: [],
          documents_metrics: {
            failed_rate: 0,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            parsed_rate: 0,
            dropped_rate: 0,
          },
        })
      );

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.simulation.success_rate).toBeNull();
        expect(outcome.result.field_changes).toEqual([]);
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('reserved field cannot be written')])
        );
      }
    });

    // ---------------------------------------------------------------------
    // Simulation strategy
    //
    // When the user already has a pipeline AND the sample documents reflect
    // its output (the default for samples.source === 'stream', or inline
    // samples explicitly tagged status === 'processed'), re-running the
    // existing steps on top of already-processed data would mis-classify
    // already-typed values as processor failures. The handler must mirror
    // `nl_to_streamlang.ts::determineSimulationStrategy` and simulate only
    // the newly-added prefix in that case.
    // ---------------------------------------------------------------------
    describe('simulation strategy', () => {
      const arrangeWinningCandidate = (deps: RunExtractFieldsDeps) => {
        mockProcessGrokPatterns.mockResolvedValue({
          type: 'grok',
          processor: grokCandidateProcessor,
          parsedRate: 1,
        });
        mockProcessDissectPattern.mockResolvedValue(null);
        mockExtractParsedSampleDocuments.mockResolvedValue({
          parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
          definitionError: false,
        });
        // Sub-agent contributes one extra step so we can verify both the
        // seed and the sub-agent step are part of the simulated subset.
        mockSuggestProcessingPipeline.mockResolvedValue({
          pipeline: {
            steps: [
              {
                action: 'date',
                from: 'attributes.timestamp',
                to: '@timestamp',
                formats: ['ISO8601'],
              } as unknown as StreamlangStep,
            ],
          },
          metadata: { stepsUsed: 2, maxSteps: 6 },
        });
        mockSimulateProcessing.mockResolvedValue(succeededSimulation());
      };

      it('uses partial mode and simulates only the newly-added steps when an existing pipeline is preserved (stream samples are processed)', async () => {
        const harmlessExistingStep = {
          action: 'set',
          to: 'attributes.environment',
          value: 'prod',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        arrangeStreamWithSamples(deps, [harmlessExistingStep]);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('partial');

        // Final simulator call must NOT include the existing `set` step —
        // that would re-run it on already-processed docs and produce
        // misleading failures.
        const simCalls = mockSimulateProcessing.mock.calls;
        const finalCall = simCalls[simCalls.length - 1][0];
        const simulatedActions = (
          finalCall.params.body.processing.steps as Array<{ action?: string }>
        ).map((s) => s.action);
        expect(simulatedActions).not.toContain('set');
        expect(simulatedActions).toEqual(expect.arrayContaining(['grok', 'date']));

        // A user-visible warning explains the partial nature of the result.
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('Simulation is partial')])
        );
      });

      it('uses complete mode and simulates the full proposed pipeline when there are no existing steps', async () => {
        const deps = buildDeps();
        arrangeStreamWithSamples(deps, []);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('complete');
        expect(outcome.result.warnings ?? []).not.toEqual(
          expect.arrayContaining([expect.stringContaining('Simulation is partial')])
        );
      });

      it('uses complete mode and simulates the full pipeline for inline `unprocessed` samples even with existing steps', async () => {
        // Unprocessed inline samples are raw inputs, so re-running the full
        // pipeline (existing + new) is the accurate simulation.
        const harmlessExistingStep = {
          action: 'set',
          to: 'attributes.environment',
          value: 'prod',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        (deps.streamsClient.getStream as jest.Mock).mockResolvedValue(
          buildIngestStreamDef([harmlessExistingStep])
        );
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow(
          {
            streamName: ingestStreamName,
            samples: {
              source: 'inline',
              status: 'unprocessed',
              documents: [
                { 'body.text': '192.168.1.1 GET / 200', 'service.name': 'web' },
                { 'body.text': '10.0.0.1 POST /login 401', 'service.name': 'web' },
              ],
            },
          },
          deps
        );

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('complete');

        // Full merged pipeline (existing `set` + new `grok` + sub-agent `date`)
        // must reach the simulator since the docs are raw.
        const simCalls = mockSimulateProcessing.mock.calls;
        const finalCall = simCalls[simCalls.length - 1][0];
        const simulatedActions = (
          finalCall.params.body.processing.steps as Array<{ action?: string }>
        ).map((s) => s.action);
        expect(simulatedActions).toEqual(expect.arrayContaining(['set', 'grok', 'date']));
      });

      it('emits a stronger partial-simulation warning when an existing step writes to or removes the source field', async () => {
        // Prepend case: the cached samples were captured AFTER the existing
        // step mutated the source, so partial simulation will under-report
        // success. The warning makes that explicit.
        const writesBodyText = {
          action: 'set',
          to: 'body.text',
          value: 'redacted',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        arrangeStreamWithSamples(deps, [writesBodyText]);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('partial');
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('cached samples may have already been mutated'),
          ])
        );
      });
    });

    it('emits a warning when the post-parse sub-agent contributes no additional steps', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 1,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      // Sub-agent produced no follow-up steps — the pipeline contains
      // only the heuristic seed step.
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: null,
        metadata: { stepsUsed: 0, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Post-parse design produced no additional steps'),
          ])
        );
      }
    });
  });
});
