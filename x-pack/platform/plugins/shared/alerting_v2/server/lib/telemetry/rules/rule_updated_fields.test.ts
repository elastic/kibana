/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleResponse } from '../../test_utils';
import { collectRuleUpdatedFields } from './rule_updated_fields';

describe('collectRuleUpdatedFields', () => {
  const previous = createRuleResponse({
    id: 'rule-1',
    metadata: { description: 'original', tags: ['ops'] },
  });

  it('reports a changed metadata leaf', () => {
    const next = createRuleResponse({
      ...previous,
      metadata: { ...previous.metadata, name: 'renamed' },
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual(['metadata.name']);
  });

  it('reports a field that was added', () => {
    const withoutTags = createRuleResponse({ metadata: { tags: undefined } });
    const withTags = createRuleResponse({ metadata: { tags: ['ops'] } });

    expect(collectRuleUpdatedFields(withoutTags, withTags)).toEqual(['metadata.tags']);
  });

  it('reports a field that was cleared', () => {
    const next = createRuleResponse({
      ...previous,
      metadata: { ...previous.metadata, description: undefined },
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual(['metadata.description']);
  });

  it('reports each nested leaf that changed', () => {
    const next = createRuleResponse({
      ...previous,
      schedule: { every: '5m', lookback: previous.schedule.lookback },
      query: { ...previous.query, base: 'FROM metrics-* | LIMIT 1' },
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual(['query.base', 'schedule.every']);
  });

  it('reports a nested builder leaf', () => {
    const next = createRuleResponse({
      ...previous,
      metadata: { ...previous.metadata, builder: { type: 'threshold' } },
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual(['metadata.builder.type']);
  });

  it('reports the path when an object and a non-object value trade places', () => {
    // An array stands in for any non-object value. The path is reported whole.
    const asValue = createRuleResponse({
      ...previous,
      recovery: ['manual'] as unknown as typeof previous.recovery,
    });

    expect(collectRuleUpdatedFields(previous, asValue)).toEqual(['recovery']);
    expect(collectRuleUpdatedFields(asValue, previous)).toEqual(['recovery']);
  });

  it('reports each leaf when an object and null trade places', () => {
    const cleared = createRuleResponse({
      ...previous,
      created_by: null,
    });

    expect(collectRuleUpdatedFields(previous, cleared)).toEqual(['created_by.profile_uid']);
    expect(collectRuleUpdatedFields(cleared, previous)).toEqual(['created_by.profile_uid']);
  });

  it('reports bookkeeping fields when they differ', () => {
    const next = createRuleResponse({
      ...previous,
      id: 'other-rule',
      enabled: !previous.enabled,
      created_at: '2026-02-01T00:00:00.000Z',
      created_by: { profile_uid: 'someone-else' },
      updated_by: { profile_uid: 'someone-else' },
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual([
      'created_at',
      'created_by.profile_uid',
      'enabled',
      'id',
      'updated_by.profile_uid',
    ]);
  });

  it('never reports version or updated_at', () => {
    const next = createRuleResponse({
      ...previous,
      version: previous.version + 1,
      updated_at: '2026-02-01T00:00:00.000Z',
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual([]);
  });

  it('returns paths in sorted order', () => {
    const next = createRuleResponse({
      ...previous,
      kind: 'signal',
      metadata: { ...previous.metadata, name: 'renamed' },
      artifacts: [{ id: 'runbook-1', type: 'runbook', data: { content: 'steps' } }],
    });

    expect(collectRuleUpdatedFields(previous, next)).toEqual([
      'artifacts',
      'kind',
      'metadata.name',
    ]);
  });

  it('treats a missing key and undefined as the same value', () => {
    const omitted = createRuleResponse();
    const explicit = createRuleResponse({ metadata: { description: undefined } });

    expect(collectRuleUpdatedFields(omitted, explicit)).toEqual([]);
  });
});
