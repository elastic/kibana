/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createResolveContextMock } from '../../test_utils';
import { mergeAttachmentInputs } from './merge_attachment_inputs';

const textType: AttachmentTypeDefinition = {
  id: 'text',
  validate: (data) => ({ valid: true, data }),
  format: () => ({ getRepresentation: () => ({ type: 'text', value: 'text' }) }),
};

describe('mergeAttachmentInputs', () => {
  const resolveContext = createResolveContextMock();
  const validateContext = { request: resolveContext.request };

  /** Merges each batch in turn, as consecutive messages on one conversation would. */
  const mergeBatches = async (batches: AttachmentInput[][]) => {
    let stored: VersionedAttachment[] = [];
    const changesPerBatch = [];

    for (const inputs of batches) {
      const stateManager = createAttachmentStateManager(stored, {
        getTypeDefinition: () => textType,
      });

      await mergeAttachmentInputs({
        stateManager,
        inputs,
        actor: ATTACHMENT_REF_ACTOR.user,
        resolveContext,
        validateContext,
      });

      changesPerBatch.push(stateManager.drainChanges());
      stored = stateManager.getAll();
    }

    return { stored, changesPerBatch };
  };

  it('versions an existing attachment when its content changes', async () => {
    const { stored, changesPerBatch } = await mergeBatches([
      [{ id: 'a1', type: 'text', data: { text: 'one' } }],
      [{ id: 'a1', type: 'text', data: { text: 'two' } }],
    ]);

    expect(stored).toHaveLength(1);
    expect(stored[0].versions).toHaveLength(2);
    expect(changesPerBatch).toEqual([
      [expect.objectContaining({ kind: 'added', attachment_id: 'a1', current_version: 1 })],
      [expect.objectContaining({ kind: 'updated', attachment_id: 'a1', current_version: 2 })],
    ]);
  });

  it('reuses a stored attachment when the same content is posted again', async () => {
    const { stored, changesPerBatch } = await mergeBatches([
      [{ type: 'text', data: { text: 'same' } }],
      [{ type: 'text', data: { text: 'same' } }],
    ]);

    expect(stored).toHaveLength(1);
    expect(changesPerBatch).toEqual([
      [expect.objectContaining({ kind: 'added', attachment_id: stored[0].id })],
      [],
    ]);
  });
});
