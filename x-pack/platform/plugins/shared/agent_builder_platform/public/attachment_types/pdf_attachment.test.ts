/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pdfAttachmentDefinition } from './pdf_attachment';

describe('pdfAttachmentDefinition', () => {
  it('uses the stored file name as the label', () => {
    expect(
      pdfAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'pdf',
        data: { name: 'invoice.pdf', file_id: 'f1', text: 'hello' },
      })
    ).toBe('invoice.pdf');
  });

  it('uses the description when there is no data (pending input attachment)', () => {
    expect(
      pdfAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'pdf',
        origin: 'f1',
        description: 'invoice.pdf',
      } as never)
    ).toBe('invoice.pdf');
  });

  it('falls back to "PDF"', () => {
    expect(pdfAttachmentDefinition.getLabel({ id: 'a1', type: 'pdf' } as never)).toBe('PDF');
  });

  it('uses the document icon and has no thumbnail or inline content', () => {
    expect(pdfAttachmentDefinition.getIcon?.()).toBe('document');
    expect(pdfAttachmentDefinition.getThumbnail).toBeUndefined();
    expect(pdfAttachmentDefinition.renderInlineContent).toBeUndefined();
  });
});
