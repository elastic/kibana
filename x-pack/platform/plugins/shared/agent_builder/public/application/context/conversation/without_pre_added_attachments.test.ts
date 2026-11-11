/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { withoutPreAddedAttachments } from './without_pre_added_attachments';

const stored = [{ id: 'pdf-1' }, { id: 'text-1' }, { id: 'dashboard-1' }] as VersionedAttachment[];

describe('withoutPreAddedAttachments', () => {
  it('drops an input without data that is already in the conversation', () => {
    const inputs: AttachmentInput[] = [{ id: 'pdf-1', type: 'binary', origin: 'file-1' }];

    expect(withoutPreAddedAttachments(inputs, stored)).toEqual([]);
  });

  it('keeps inputs with data, new inputs and inputs without an id', () => {
    const inputs: AttachmentInput[] = [
      { id: 'text-1', type: 'text', data: { content: 'changed' } },
      { id: 'pdf-2', type: 'binary', origin: 'file-2' },
      { type: 'text', data: { content: 'new' } },
    ];

    expect(withoutPreAddedAttachments(inputs, stored)).toEqual(inputs);
  });

  it('keeps a stored by-reference attachment of another type, so the server can refresh it', () => {
    const inputs: AttachmentInput[] = [{ id: 'dashboard-1', type: 'dashboard', origin: 'so-1' }];

    expect(withoutPreAddedAttachments(inputs, stored)).toEqual(inputs);
  });

  it('keeps every input when the conversation attachments are unknown', () => {
    const inputs: AttachmentInput[] = [{ id: 'pdf-1', type: 'binary', origin: 'file-1' }];

    expect(withoutPreAddedAttachments(inputs, undefined)).toEqual(inputs);
  });
});
