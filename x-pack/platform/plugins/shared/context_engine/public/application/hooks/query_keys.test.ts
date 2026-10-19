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
    const base = contextEngineQueryKeys.aiIndex.listKi('idx', 25, undefined, KI_LIFECYCLE_STATUSES);
    const otherSize = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      50,
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
      KI_LIFECYCLE_STATUSES
    );
    const withType = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      'playbook',
      KI_LIFECYCLE_STATUSES
    );

    expect(withoutType).not.toEqual(withType);
    expect(withoutType[5]).toBe('');
    expect(withType[5]).toBe('playbook');
  });

  it('differs when lifecycle status filter changes', () => {
    const allStatuses = contextEngineQueryKeys.aiIndex.listKi(
      'idx',
      25,
      undefined,
      KI_LIFECYCLE_STATUSES
    );
    const activeOnly = contextEngineQueryKeys.aiIndex.listKi('idx', 25, undefined, ['active']);

    expect(allStatuses).not.toEqual(activeOnly);
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
