/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';
import { improvementsSchema } from './storage';

interface MappingProp {
  type: string;
  enabled?: boolean;
  ignore_above?: number;
  index?: boolean;
  doc_values?: boolean;
  properties?: Record<string, MappingProp>;
}

const props = improvementsSchema.properties as unknown as Record<string, MappingProp>;

describe('improvements storage', () => {
  it('names a single global user index (not per-space, not a hidden system index)', () => {
    expect(IMPROVEMENTS_INDEX).toBe('context-engine-improvements');
    expect(IMPROVEMENTS_INDEX.startsWith('.')).toBe(false);
    expect(IMPROVEMENTS_INDEX).not.toMatch(/-$/);
  });

  it('indexes the append-log lineage fields so `list`/`get` can filter on the head', () => {
    expect(props.improvement_id.type).toBe('keyword');
    expect(props.revision_id.type).toBe('keyword');
    expect(props.previous_revision_id.type).toBe('keyword');
    expect(props.latest.type).toBe('boolean');
  });

  it('indexes the fields the review UI filters and sorts on', () => {
    expect(props.ai_index_id.type).toBe('keyword');
    expect(props.status.type).toBe('keyword');
    expect(props.action.type).toBe('keyword');
    expect(props['@timestamp'].type).toBe('date');
    expect(props.suggested_at.type).toBe('date');
    expect(props.applied_at.type).toBe('date');
    expect(props.rejected_at.type).toBe('date');
  });

  it('maps the human-facing copy as text', () => {
    expect(props.title.type).toBe('text');
    expect(props.rationale.type).toBe('text');
  });

  it('indexes the `target.*` ids as keywords, so "every suggestion touching workflow X" is queryable', () => {
    expect(props.target.type).toBe('object');
    for (const field of ['ki_id', 'workflow_id', 'subject'] as const) {
      expect(props.target.properties?.[field].type).toBe('keyword');
      expect(props.target.properties?.[field].index).not.toBe(false);
    }
  });

  it('keeps `target.source_value` out of the index, since it is unbounded and unqueried', () => {
    // An ES|QL source value can run past the adapter's default `ignore_above: 1024`, which would
    // silently stop indexing it; dedup keys off `improvement_id`, which hashes the value already.
    const sourceValue = props.target.properties?.source_value;
    expect(sourceValue?.index).toBe(false);
    expect(sourceValue?.doc_values).toBe(false);
  });

  it('keeps `payload` and `resolution` in _source without indexing them', () => {
    // Proposed KI content and workflow YAML run to several kilobytes; `flattened` with its
    // `ignore_above` would silently drop them, and nothing queries inside the change.
    expect(props.payload.type).toBe('object');
    expect(props.payload.enabled).toBe(false);
    expect(props.resolution.type).toBe('object');
    expect(props.resolution.enabled).toBe(false);
  });

  it('indexes provenance so the UI can drill back to the signals behind a suggestion', () => {
    const provenance = props.provenance.properties;
    expect(provenance?.agent_run_id.type).toBe('keyword');
    expect(provenance?.signal_ids.type).toBe('keyword');
    expect(provenance?.signal_spaces.type).toBe('keyword');
    expect(provenance?.tags.type).toBe('keyword');
    expect(provenance?.signal_count.type).toBe('long');
    expect(provenance?.signal_window.properties?.from.type).toBe('date');
    expect(provenance?.signal_window.properties?.to.type).toBe('date');
  });
});
