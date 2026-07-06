/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSmlHttpItem } from './common';
import { sampleDocument } from './test_helpers';

describe('toSmlHttpItem', () => {
  it('maps every SmlDocument field onto the HTTP wire shape', () => {
    expect(toSmlHttpItem(sampleDocument)).toEqual({
      id: sampleDocument.id,
      type: sampleDocument.type,
      title: sampleDocument.title,
      origin: sampleDocument.origin,
      content: sampleDocument.content,
      description: sampleDocument.description,
      tags: sampleDocument.tags,
      references: sampleDocument.references,
      created_at: sampleDocument.created_at,
      updated_at: sampleDocument.updated_at,
      spaces: sampleDocument.spaces,
      permissions: sampleDocument.permissions,
      ingestion_method: sampleDocument.ingestion_method,
    });
  });

  it('defaults description, tags, and references when absent from the document', () => {
    const { description, tags, references, ...docWithoutOptionalFields } = sampleDocument;
    const item = toSmlHttpItem(docWithoutOptionalFields);
    expect(item.description).toBe('');
    expect(item.tags).toEqual([]);
    expect(item.references).toEqual([]);
  });
});
