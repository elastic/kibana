/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KI_LIFECYCLE_STATUSES } from '../../../common/step_types/ki';
import { contextEngineQueryKeys } from './query_keys';

describe('contextEngineQueryKeys.aiIndex.listKi', () => {
  it('differs when size changes', () => {
    const base = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );
    const otherSize = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      50,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );

    expect(base).not.toEqual(otherSize);
  });

  it('differs when type changes and uses empty string for undefined type', () => {
    const withoutType = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );
    const withType = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      'playbook',
      undefined,
      KI_LIFECYCLE_STATUSES
    );

    expect(withoutType).not.toEqual(withType);
    expect(withoutType[5]).toBe('');
    expect(withType[5]).toBe('playbook');
  });

  it('differs when query changes and uses empty string for undefined query', () => {
    const withoutQuery = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );
    const withQuery = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      'refund',
      KI_LIFECYCLE_STATUSES
    );

    expect(withoutQuery).not.toEqual(withQuery);
    expect(withoutQuery[6]).toBe('');
    expect(withQuery[6]).toBe('refund');
  });

  it('differs when lifecycle status filter changes', () => {
    const omitted = contextEngineQueryKeys.aiIndex.listKi('idx', 25, undefined, undefined);
    const activeOnly = contextEngineQueryKeys.aiIndex.listKi('idx', 25, undefined, undefined, [
      'active',
    ]);
    const allStatuses = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );

    expect(omitted).not.toEqual(activeOnly);
    expect(allStatuses).not.toEqual(activeOnly);
  });

  it('keeps excluded types as a sorted array, so type names with commas never clash', () => {
    const key = (excludeTypes?: string[]) =>
      contextEngineQueryKeys.aiIndex.listKi(
        'idx',
        25,
        undefined,
        undefined,
        [],
        'updated',
        excludeTypes
      );

    expect(key(['b', 'a'])).toEqual(key(['a', 'b']));
    expect(key(['a,b'])).not.toEqual(key(['a', 'b']));
    expect(key()).not.toEqual(key(['a']));
  });
});

describe('contextEngineQueryKeys.aiIndex.listKiGroups', () => {
  it('sits under the list_ki prefix, so KI mutations invalidate it too', () => {
    const key = contextEngineQueryKeys.aiIndex.listKiGroups(
      'idx',
      5,
      10,
      undefined,
      ['active'],
      'updated'
    );
    expect(key.slice(0, 4)).toEqual(['context_engine', 'ai_index', 'idx', 'list_ki']);
    expect(key).not.toEqual(
      contextEngineQueryKeys.aiIndex.listKiGroups('idx', 5, 10, 'refund', ['active'], 'updated')
    );
  });

  it('keeps exclude types apart from types, in any order', () => {
    const groups = (types?: string[], excludeTypes?: string[]) =>
      contextEngineQueryKeys.aiIndex.listKiGroups(
        'idx',
        10,
        50,
        undefined,
        ['active'],
        'updated',
        types,
        excludeTypes
      );
    expect(groups(undefined, ['b', 'a'])).toEqual(groups(undefined, ['a', 'b']));
    expect(groups(undefined, ['a'])).not.toEqual(groups(['a']));
    // Type names may contain commas: an array, not a joined string.
    expect(groups(undefined, ['a,b'])).not.toEqual(groups(undefined, ['a', 'b']));
  });
});

describe('contextEngineQueryKeys.aiIndex.viewKi', () => {
  it('differs when index or ki id changes', () => {
    const first = contextEngineQueryKeys.aiIndex.viewKi(
      'idx',
      'ai-index-idx-a',
      'ki-1',
      KI_LIFECYCLE_STATUSES
    );
    const otherIndex = contextEngineQueryKeys.aiIndex.viewKi(
      'idx',
      'ai-index-idx-b',
      'ki-1',
      KI_LIFECYCLE_STATUSES
    );
    const otherKi = contextEngineQueryKeys.aiIndex.viewKi(
      'idx',
      'ai-index-idx-a',
      'ki-2',
      KI_LIFECYCLE_STATUSES
    );

    expect(first).not.toEqual(otherIndex);
    expect(first).not.toEqual(otherKi);
  });

  it('keeps list and view keys distinct for the same AI index', () => {
    const listKey = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      undefined,
      KI_LIFECYCLE_STATUSES
    );
    const viewKey = contextEngineQueryKeys.aiIndex.viewKi(
      'idx',
      'ai-index-idx-a',
      'ki-1',
      KI_LIFECYCLE_STATUSES
    );

    expect(listKey).not.toEqual(viewKey);
    expect(listKey[3]).toBe('list_ki');
    expect(viewKey[3]).toBe('ki');
  });
});

describe('contextEngineQueryKeys.aiIndex.kiHistogram', () => {
  it('sits under the list_ki prefix, so KI mutations invalidate it too', () => {
    expect(contextEngineQueryKeys.aiIndex.kiHistogram('idx')).toEqual([
      'context_engine',
      'ai_index',
      'idx',
      'list_ki',
      '_histogram',
    ]);
  });
});
