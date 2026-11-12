/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { binaryAttachmentDefinition } from './binary_attachment';

describe('binaryAttachmentDefinition', () => {
  it('uses the stored file name as the label', () => {
    expect(
      binaryAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'binary',
        data: { name: 'invoice.pdf', file_id: 'f1', text: 'hello' },
      })
    ).toBe('invoice.pdf');
  });

  it('uses the description when there is no data (pending input attachment)', () => {
    expect(
      binaryAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'binary',
        origin: 'f1',
        description: 'invoice.pdf',
      } as never)
    ).toBe('invoice.pdf');
  });

  it('falls back to "File"', () => {
    expect(binaryAttachmentDefinition.getLabel({ id: 'a1', type: 'binary' } as never)).toBe('File');
  });

  it('uses the document icon and has no thumbnail or inline content', () => {
    expect(binaryAttachmentDefinition.getIcon?.()).toBe('document');
    expect(binaryAttachmentDefinition.getThumbnail).toBeUndefined();
    expect(binaryAttachmentDefinition.renderInlineContent).toBeUndefined();
  });
});
