/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { textAttachmentDefinition } from './text_attachment';

describe('textAttachmentDefinition', () => {
  it('labels a text file by its name', () => {
    expect(
      textAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'text',
        data: { content: '# Hi', name: 'notes.md' },
      } as never)
    ).toBe('notes.md');
  });

  it('labels a text attachment without a name as "Text"', () => {
    expect(
      textAttachmentDefinition.getLabel({
        id: 'a1',
        type: 'text',
        data: { content: 'x' },
      } as never)
    ).toBe('Text');
  });
});
