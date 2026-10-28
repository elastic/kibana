/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenDocument } from './flatten_document';

describe('flattenDocument', () => {
  it('flattens objects into dotted paths and keeps arrays of values', () => {
    expect(
      flattenDocument({ event: { category: ['network'] }, source: { ip: '81.2.69.142' } })
    ).toEqual({ 'event.category': ['network'], 'source.ip': '81.2.69.142' });
  });

  it('collects each sub-field of an array of objects into one array', () => {
    expect(
      flattenDocument({
        email: {
          attachments: [
            { file: { name: 'a.pdf', size: 1024 } },
            { file: { name: 'b.pdf', hash: { md5: ['abc'] } } },
          ],
        },
      })
    ).toEqual({
      'email.attachments.file.name': ['a.pdf', 'b.pdf'],
      'email.attachments.file.size': [1024],
      'email.attachments.file.hash.md5': ['abc'],
    });
  });
});
