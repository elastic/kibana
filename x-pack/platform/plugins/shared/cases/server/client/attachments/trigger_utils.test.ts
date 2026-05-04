/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { emitCommentAddedEvent } from './trigger_utils';

const makeCase = (id: string, comments: Array<{ id: string }>): Case =>
  ({ id, comments, owner: 'securitySolution' } as unknown as Case);

describe('emitCommentAddedEvent', () => {
  it('emits commentAdded with the matching comment ids', () => {
    const clientArgs = createCasesClientMockArgs();
    const comment1 = { id: 'comment-1' };
    const comment2 = { id: 'comment-2' };
    const updatedCase = makeCase('case-1', [comment1, comment2]);

    emitCommentAddedEvent(clientArgs, updatedCase, ['comment-1']);

    expect(clientArgs.casesEventBus.emitCommentAdded).toHaveBeenCalledWith(
      clientArgs.request,
      { caseId: 'case-1', caseCommentIds: ['comment-1'], owner: 'securitySolution' }
    );
  });

  it('does nothing when casesEventBus is absent', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.casesEventBus = undefined as unknown as typeof clientArgs.casesEventBus;
    const updatedCase = makeCase('case-1', [{ id: 'comment-1' }]);

    expect(() => emitCommentAddedEvent(clientArgs, updatedCase, ['comment-1'])).not.toThrow();
  });
});
