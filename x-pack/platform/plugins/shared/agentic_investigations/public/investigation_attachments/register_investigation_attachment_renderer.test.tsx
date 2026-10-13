/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  registerInvestigationAttachmentRenderer,
  type InvestigationAttachmentContentProps,
} from './register_investigation_attachment_renderer';

interface Note {
  text: string;
}

const NoteContent = ({ document, variant }: InvestigationAttachmentContentProps<Note>) => (
  <div data-test-subj={`note-${variant}`}>{document.text}</div>
);

const register = () => {
  const addAttachmentType = jest.fn();
  const loadContent = jest.fn().mockResolvedValue(NoteContent);
  registerInvestigationAttachmentRenderer(
    { attachments: { addAttachmentType } } as unknown as AgentBuilderPluginStart,
    { type: 'investigation_note', getLabel: () => 'Note', icon: 'document', loadContent }
  );
  const [type, definition] = addAttachmentType.mock.calls[0] as [
    string,
    AttachmentUIDefinition<Attachment<'investigation_note', Note>>
  ];
  return { type, definition, loadContent };
};

const attachment: Attachment<'investigation_note', Note> = {
  id: 'note-1',
  type: 'investigation_note',
  data: { text: 'hello' },
};

describe('registerInvestigationAttachmentRenderer', () => {
  it('registers the label and icon under the attachment type', () => {
    const { type, definition, loadContent } = register();

    expect(type).toBe('investigation_note');
    expect(definition.getLabel(attachment)).toBe('Note');
    expect(definition.getIcon?.()).toBe('document');
    // The content is not imported until something renders it.
    expect(loadContent).not.toHaveBeenCalled();
  });

  it('lazily renders the same content inline and in the details flyout', async () => {
    const { definition } = register();

    render(
      <>
        {definition.renderInlineContent?.({ attachment, isSidebar: false } as never)}
        {definition.renderConversationDetailsContent?.({ attachment } as never)}
      </>
    );

    expect(await screen.findByTestId('note-inline')).toHaveTextContent('hello');
    expect(await screen.findByTestId('note-details')).toHaveTextContent('hello');
  });
});
