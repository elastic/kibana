/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTabbedContent, EuiTextArea } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Markdown } from '../../markdown';
import { UpdateInternalNewNote } from '../helpers';
import * as i18n from '../translations';

const NewNoteTabs = styled(EuiTabbedContent)`
  width: 100%;
`;

NewNoteTabs.displayName = 'NewNoteTabs';

interface MarkdownContainerProps {
  height: number;
}

const MarkdownContainer = styled(EuiPanel)<MarkdownContainerProps>`
  height: ${({ height }) => height}px;
  overflow: auto;
`;

MarkdownContainer.displayName = 'MarkdownContainer';

interface TextAreaProps {
  height: number;
}

const TextArea = styled(EuiTextArea)<TextAreaProps>`
  min-height: ${({ height }) => `${height}px`};
  width: 100%;
`;

TextArea.displayName = 'TextArea';

TextArea.displayName = 'TextArea';

interface NewNoteProps {
  noteInputHeight: number;
  note: string;
  updateNewNote: UpdateInternalNewNote;
}

/** An input for entering a new note  */
export const NewNote = React.memo<NewNoteProps>(({ note, noteInputHeight, updateNewNote }) => {
  const tabs = [
    {
      id: 'note',
      name: i18n.NOTE,
      content: (
        <TextArea
          autoFocus
          aria-label={i18n.NOTE}
          data-test-subj="add-a-note"
          fullWidth={true}
          height={noteInputHeight}
          onChange={e => updateNewNote(e.target.value)}
          placeholder={i18n.ADD_A_NOTE}
          spellCheck={true}
          value={note}
        />
      ),
    },
    {
      id: 'preview',
      name: i18n.PREVIEW_MARKDOWN,
      content: (
        <MarkdownContainer
          data-test-subj="markdown-container"
          height={noteInputHeight}
          paddingSize="s"
        >
          <Markdown raw={note} />
        </MarkdownContainer>
      ),
    },
  ];

  return <NewNoteTabs data-test-subj="new-note-tabs" tabs={tabs} initialSelectedTab={tabs[0]} />;
});

NewNote.displayName = 'NewNote';
