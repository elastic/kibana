/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStaleAttachmentInputs } from '../../application/context/conversation/get_stale_attachment_inputs';

describe('getStaleAttachmentInputs', () => {
  it('returns attachment inputs only for stale attachments not in exclude set', () => {
    const result = getStaleAttachmentInputs(
      {
        attachments: [
          {
            id: 'att-1',
            is_stale: true,
            data: { foo: 'bar' },
            type: 'visualization',
            hidden: false,
          },
          {
            id: 'att-2',
            is_stale: true,
            data: { value: 'hello' },
            type: 'text',
            hidden: true,
          },
          { id: 'att-3', is_stale: false },
        ],
      },
      new Set(['att-2'])
    );

    expect(result).toEqual([
      {
        id: 'att-1',
        type: 'visualization',
        data: { foo: 'bar' },
        hidden: false,
      },
    ]);
  });

  it('returns empty when exclude set contains all stale attachment ids', () => {
    const result = getStaleAttachmentInputs(
      {
        attachments: [
          {
            id: 'att-1',
            is_stale: true,
            data: { value: 'test' },
            type: 'visualization',
          },
        ],
      },
      new Set(['att-1'])
    );

    expect(result).toEqual([]);
  });
});
