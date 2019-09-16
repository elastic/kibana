/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Note } from '../../../lib/note';
import { AddNote } from '../add_note';
import { AssociateNote, GetNewNoteId, UpdateNote } from '../helpers';
import { NoteCard } from '../note_card';
import { useTimelineWidthContext } from '../../timeline/timeline_context';

const AddNoteContainer = styled.div``;

AddNoteContainer.displayName = 'AddNoteContainer';

const NoteContainer = styled.div`
  margin-top: 5px;
`;

NoteContainer.displayName = 'NoteContainer';

interface NoteCardsCompProps {
  children: React.ReactNode;
}

const NoteCardsComp = React.memo<NoteCardsCompProps>(({ children }) => {
  const width = useTimelineWidthContext();

  // Passing the styles directly to the component because the width is
  // being calculated and is recommended by Styled Components for performance
  // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
  return (
    <EuiPanel
      data-test-subj="note-cards"
      hasShadow={false}
      paddingSize="none"
      style={{ width: `${width - 10}px`, border: 'none' }}
    >
      {children}
    </EuiPanel>
  );
});

NoteCardsComp.displayName = 'NoteCardsComp';

const NotesContainer = styled(EuiFlexGroup)`
  padding: 0 5px;
  margin-bottom: 5px;
`;

NotesContainer.displayName = 'NotesContainer';

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  showAddNote: boolean;
  toggleShowAddNote: () => void;
  updateNote: UpdateNote;
}

interface State {
  newNote: string;
}

/** A view for entering and reviewing notes */
export class NoteCards extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { newNote: '' };
  }

  public render() {
    const {
      getNotesByIds,
      getNewNoteId,
      noteIds,
      showAddNote,
      toggleShowAddNote,
      updateNote,
    } = this.props;

    return (
      <NoteCardsComp>
        {noteIds.length ? (
          <NotesContainer data-test-subj="notes" direction="column" gutterSize="none">
            {getNotesByIds(noteIds).map(note => (
              <NoteContainer data-test-subj="note-container" key={note.id}>
                <NoteCard created={note.created} rawNote={note.note} user={note.user} />
              </NoteContainer>
            ))}
          </NotesContainer>
        ) : null}

        {showAddNote ? (
          <AddNoteContainer data-test-subj="add-note-container">
            <AddNote
              associateNote={this.associateNoteAndToggleShow}
              getNewNoteId={getNewNoteId}
              newNote={this.state.newNote}
              onCancelAddNote={toggleShowAddNote}
              updateNewNote={this.updateNewNote}
              updateNote={updateNote}
            />
          </AddNoteContainer>
        ) : null}
      </NoteCardsComp>
    );
  }

  private associateNoteAndToggleShow = (noteId: string) => {
    this.props.associateNote(noteId);
    this.props.toggleShowAddNote();
  };

  private updateNewNote = (newNote: string): void => {
    this.setState({ newNote });
  };
}
