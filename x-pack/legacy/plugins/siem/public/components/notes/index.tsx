/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiModalBody,
  EuiModalHeader,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';

import { Note } from '../../lib/note';

import { AddNote } from './add_note';
import { columns } from './columns';
import { AssociateNote, GetNewNoteId, NotesCount, search, UpdateNote } from './helpers';
import { NOTES_PANEL_WIDTH, NOTES_PANEL_HEIGHT } from '../timeline/properties/notes_size';

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  updateNote: UpdateNote;
}

const NotesPanel = styled(EuiPanel)`
  height: ${NOTES_PANEL_HEIGHT}px;
  width: ${NOTES_PANEL_WIDTH}px;

  & thead {
    display: none;
  }
`;

NotesPanel.displayName = 'NotesPanel';

const InMemoryTable: typeof EuiInMemoryTable & { displayName: string } = styled(
  EuiInMemoryTable as React.ComponentType<EuiInMemoryTableProps<Note>>
)`
  overflow-x: hidden;
  overflow-y: auto;
  height: 220px;
` as any; // eslint-disable-line @typescript-eslint/no-explicit-any

InMemoryTable.displayName = 'InMemoryTable';

/** A view for entering and reviewing notes */
export const Notes = React.memo<Props>(
  ({ associateNote, getNotesByIds, getNewNoteId, noteIds, updateNote }) => {
    const [newNote, setNewNote] = useState('');

    return (
      <NotesPanel>
        <EuiModalHeader>
          <NotesCount noteIds={noteIds} />
        </EuiModalHeader>

        <EuiModalBody>
          <AddNote
            associateNote={associateNote}
            getNewNoteId={getNewNoteId}
            newNote={newNote}
            updateNewNote={setNewNote}
            updateNote={updateNote}
          />
          <EuiSpacer size="s" />
          <InMemoryTable
            columns={columns}
            data-test-subj="notes-table"
            items={getNotesByIds(noteIds)}
            search={search}
            sorting={true}
          />
        </EuiModalBody>
      </NotesPanel>
    );
  }
);

Notes.displayName = 'Notes';
