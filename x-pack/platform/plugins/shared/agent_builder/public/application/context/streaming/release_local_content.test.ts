/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { createExecutionFailedEvent } from '../../components/conversations/timeline/items/execution_failed_event.factory';
import { releaseLocalContent } from './release_local_content';

const refetchWith = (events: Conversation['events']) => jest.fn().mockResolvedValue({ events });

describe('releaseLocalContent', () => {
  it('clears the live execution once its failed terminal is saved', async () => {
    const clearExecution = jest.fn();

    await releaseLocalContent({
      refetch: refetchWith([createExecutionFailedEvent({ execution_id: 'exec-1' })]),
      executionId: 'exec-1',
      clearExecution,
    });

    expect(clearExecution).toHaveBeenCalledWith('exec-1');
  });

  it('keeps the live execution while no terminal for it is saved', async () => {
    const clearExecution = jest.fn();

    await releaseLocalContent({ refetch: refetchWith([]), executionId: 'exec-1', clearExecution });

    expect(clearExecution).not.toHaveBeenCalled();
  });
});
