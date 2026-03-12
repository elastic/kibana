/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAttachmentInputsFromStaleResponse } from './attachements_service';

describe('toAttachmentInputsFromStaleResponse', () => {
  it('returns staged inputs only for stale attachments with object payload and known type', () => {
    const result = toAttachmentInputsFromStaleResponse(
      {
        attachments: [
          {
            attachment_id: 'att-1',
            is_stale: true,
            latest_version: 2,
            resolved_data: { foo: 'bar' },
          },
          {
            attachment_id: 'att-2',
            is_stale: true,
            latest_version: 1,
            resolved_data: 'string payload',
          },
          {
            attachment_id: 'att-3',
            is_stale: false,
            latest_version: 3,
            resolved_data: { baz: 1 },
          },
          {
            attachment_id: 'att-4',
            is_stale: true,
            latest_version: 5,
            resolved_data: { qux: 1 },
          },
        ],
      },
      new Map([
        ['att-1', 'visualization'],
        ['att-2', 'visualization'],
      ]),
      new Map([
        ['att-1', false],
        ['att-2', true],
      ])
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
});
