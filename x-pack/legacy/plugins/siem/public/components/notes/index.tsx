/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiInMemoryTable,
  EuiModalBody,
  EuiModalHeader,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import * as React from 'react';
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

interface State {
  newNote: string;
}

const NotesPanel = styled(EuiPanel)`
  height: ${NOTES_PANEL_HEIGHT}px;
  width: ${NOTES_PANEL_WIDTH}px;

  & thead {
    display: none;
  }
`;

const InMemoryTable = styled(EuiInMemoryTable)`
  overflow-x: hidden;
  overflow-y: auto;
  height: 220px;
`;

/** A view for entering and reviewing notes */
export class Notes extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { newNote: '' };
  }

  public render() {
    const { associateNote, getNotesByIds, getNewNoteId, noteIds, updateNote } = this.props;

    return (
      <NotesPanel>
        <EuiModalHeader>
          <NotesCount noteIds={noteIds} />
        </EuiModalHeader>

        <EuiModalBody>
          <AddNote
            associateNote={associateNote}
            getNewNoteId={getNewNoteId}
            newNote={this.state.newNote}
            updateNewNote={this.updateNewNote}
            updateNote={updateNote}
          />
          <EuiSpacer size="s" />
          <InMemoryTable
            data-test-subj="notes-table"
            items={getNotesByIds(noteIds)}
            columns={columns}
            pagination={false}
            search={search}
            sorting={true}
          />
        </EuiModalBody>
      </NotesPanel>
    );
  }

  private updateNewNote = (newNote: string): void => {
    this.setState({ newNote });
  };
}
