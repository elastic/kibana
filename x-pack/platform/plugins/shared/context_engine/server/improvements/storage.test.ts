/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IMPROVEMENT_INDEX_PREFIX,
  buildImprovementsIndexName,
} from '../../common/http_api/improvements';
import { improvementsSchema } from './storage';

interface MappingProp {
  type: string;
  enabled?: boolean;
  properties?: Record<string, MappingProp>;
}

const props = improvementsSchema.properties as unknown as Record<string, MappingProp>;

describe('improvements storage', () => {
  // The prefix is what `kibana_system` is granted on, so a rename is a breaking change until the
  // Elasticsearch role covers the new pattern.
  it('names a per-space index under the `.contextengine-` prefix Kibana can write to', () => {
    expect(IMPROVEMENT_INDEX_PREFIX).toBe('.contextengine-improvements-');
    expect(buildImprovementsIndexName('default')).toBe('.contextengine-improvements-default');
    expect(buildImprovementsIndexName('my-space')).toBe('.contextengine-improvements-my-space');
  });

  it('types the fields the review UI and the agent-history read filter and sort on', () => {
    expect(props.improvement_id.type).toBe('keyword');
    expect(props.ai_index_id.type).toBe('keyword');
    expect(props.status.type).toBe('keyword');
    expect(props.action.type).toBe('keyword');
    expect(props.suggested_at.type).toBe('date');
    expect(props.applied_at.type).toBe('date');
    expect(props.rejected_at.type).toBe('date');
  });

  it('keeps the agent-authored payload and the resolution in _source without indexing them', () => {
    expect(props.payload.type).toBe('object');
    expect(props.payload.enabled).toBe(false);
    expect(props.resolution.type).toBe('object');
    expect(props.resolution.enabled).toBe(false);
  });

  it('maps the apply target so an applied suggestion can be traced to what it changed', () => {
    expect(props.target.properties?.ki_id.type).toBe('keyword');
    expect(props.target.properties?.workflow_id.type).toBe('keyword');
  });

  it('maps the signal evidence as keyword arrays and the confidence as a float', () => {
    expect(props.signal_tags.type).toBe('keyword');
    expect(props.signal_ids.type).toBe('keyword');
    expect(props.confidence.type).toBe('float');
  });
});
