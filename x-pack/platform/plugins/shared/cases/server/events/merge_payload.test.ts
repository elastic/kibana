/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../client/mocks';
import { emitAttachmentsAddedEvent } from '../client/attachments/trigger_utils';
import { getMergeEventPayload } from './merge_payload';

describe('getMergeEventPayload', () => {
  it('adds nothing outside a merge', () => {
    expect(getMergeEventPayload(undefined, 'case-1')).toEqual({});
  });

  it('names the sources and the destination', () => {
    expect(
      getMergeEventPayload({ sourceCaseIds: ['a', 'b'], destinationCaseId: 'c' }, 'a')
    ).toEqual({ merge: { sourceCaseIds: ['a', 'b'], destinationCaseId: 'c' } });
  });

  it('uses the case the event is about while a new destination has no id yet', () => {
    expect(getMergeEventPayload({ sourceCaseIds: ['a', 'b'] }, 'new-case')).toEqual({
      merge: { sourceCaseIds: ['a', 'b'], destinationCaseId: 'new-case' },
    });
  });

  it('is added to the events of writes made with a merge context', () => {
    const clientArgs = {
      ...createCasesClientMockArgs(),
      mergeContext: { sourceCaseIds: ['a', 'b'], destinationCaseId: 'c' },
    };

    emitAttachmentsAddedEvent(clientArgs, { id: 'c', owner: 'cases' }, ['att-1'], 'user');

    expect(clientArgs.casesEventBus?.emitAttachmentsAdded).toHaveBeenCalledWith(
      clientArgs.request,
      expect.objectContaining({
        caseId: 'c',
        merge: { sourceCaseIds: ['a', 'b'], destinationCaseId: 'c' },
      })
    );
  });
});
