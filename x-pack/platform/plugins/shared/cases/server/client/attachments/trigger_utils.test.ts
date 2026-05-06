/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitAttachmentsAddedEvent } from './trigger_utils';

const makeCase = (id: string): Case => ({ id, owner: 'securitySolution' } as unknown as Case);

describe('emitAttachmentsAddedEvent', () => {
  it('emits attachmentsAdded with the attachment ids and type', () => {
    const clientArgs = createCasesClientMockArgs();
    const updatedCase = makeCase('case-1');

    emitAttachmentsAddedEvent(clientArgs, updatedCase, ['attachment-1', 'attachment-2'], 'comment');

    expect(clientArgs.casesEventBus.emitAttachmentsAdded).toHaveBeenCalledWith(clientArgs.request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1', 'attachment-2'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
  });

  it('does nothing when casesEventBus is absent', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.casesEventBus = undefined as unknown as typeof clientArgs.casesEventBus;
    const updatedCase = makeCase('case-1');

    expect(() =>
      emitAttachmentsAddedEvent(clientArgs, updatedCase, ['attachment-1'], 'comment')
    ).not.toThrow();
  });
});
