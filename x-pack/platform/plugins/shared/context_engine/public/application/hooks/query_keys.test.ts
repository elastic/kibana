/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KI_LIFECYCLE_STATUSES } from '../../../common/step_types/ki';
import { contextEngineQueryKeys } from './query_keys';

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

  it('differs when lifecycle status filter changes', () => {
    const allStatuses = contextEngineQueryKeys.aiIndex.viewKi(
      'idx',
      'ai-index-idx-a',
      'ki-1',
      KI_LIFECYCLE_STATUSES
    );
    const activeOnly = contextEngineQueryKeys.aiIndex.viewKi('idx', 'ai-index-idx-a', 'ki-1', [
      'active',
    ]);

    expect(allStatuses).not.toEqual(activeOnly);
  });
});
