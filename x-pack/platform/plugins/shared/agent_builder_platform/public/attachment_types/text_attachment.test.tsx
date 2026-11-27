/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, type TextAttachment } from '@kbn/agent-builder-common/attachments';
import { textAttachmentDefinition } from './text_attachment';

const textAttachment = (description?: string): TextAttachment => ({
  id: 'a1',
  type: AttachmentType.text,
  data: { content: 'hello' },
  ...(description !== undefined ? { description } : {}),
});

describe('textAttachmentDefinition.getLabel', () => {
  it('labels the attachment with its description', () => {
    expect(textAttachmentDefinition.getLabel(textAttachment('Investigation context'))).toBe(
      'Investigation context'
    );
  });

  it.each([undefined, ''])('falls back to "Text" when the description is %p', (description) => {
    expect(textAttachmentDefinition.getLabel(textAttachment(description))).toBe('Text');
  });
});
