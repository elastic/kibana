/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { TextAttachment } from '@kbn/agent-builder-common/attachments';
import { textAttachmentDefinition } from './text_attachment';

const attachment: TextAttachment = {
  id: 'test',
  type: AttachmentType.text,
  data: { content: 'Forensic assessment' },
};

describe('textAttachmentDefinition', () => {
  it('registers an inline renderer', () => {
    expect(typeof textAttachmentDefinition.renderInlineContent).toBe('function');
  });

  it('registers a conversation details renderer so the flyout Attachments tab does not skip it', () => {
    expect(typeof textAttachmentDefinition.renderConversationDetailsContent).toBe('function');
  });

  it('renders the text content in the conversation details flyout', () => {
    const element = textAttachmentDefinition.renderConversationDetailsContent?.({ attachment });

    expect(element).toBeDefined();
  });
});
