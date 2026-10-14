/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { documentAttachmentDefinition } from './document_attachment';

describe('documentAttachmentDefinition', () => {
  it('uses the stored file name as the label', () => {
    expect(
      documentAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'document',
        data: { name: 'invoice.pdf', file_id: 'f1', text: 'hello' },
      })
    ).toBe('invoice.pdf');
  });

  it('uses the description when there is no data (pending input attachment)', () => {
    expect(
      documentAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'document',
        origin: 'f1',
        description: 'invoice.pdf',
      } as never)
    ).toBe('invoice.pdf');
  });

  it('falls back to "Document"', () => {
    expect(documentAttachmentDefinition.getLabel({ id: 'a1', type: 'document' } as never)).toBe(
      'Document'
    );
  });

  it('uses the document icon and has no thumbnail or inline content', () => {
    expect(documentAttachmentDefinition.getIcon?.()).toBe('document');
    expect(documentAttachmentDefinition.getThumbnail).toBeUndefined();
    expect(documentAttachmentDefinition.renderInlineContent).toBeUndefined();
  });
});
