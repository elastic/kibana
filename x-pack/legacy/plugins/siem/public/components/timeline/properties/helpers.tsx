/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBadgeProps,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiOverlayMask,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import uuid from 'uuid';
import styled from 'styled-components';

import { Note } from '../../../lib/note';
import { Notes } from '../../notes';
import { AssociateNote, UpdateNote } from '../../notes/helpers';

import {
  ButtonContainer,
  DescriptionContainer,
  LabelText,
  NameField,
  SmallNotesButtonContainer,
  StyledStar,
} from './styles';
import * as i18n from './translations';
import { NOTES_PANEL_WIDTH } from './notes_size';

export const historyToolTip = 'The chronological history of actions related to this timeline';
export const streamLiveToolTip = 'Update the Timeline as new data arrives';
export const newTimelineToolTip = 'Create a new timeline';

// Ref: https://github.com/elastic/eui/issues/1655
// const NotesCountBadge = styled(EuiBadge)`
//   margin-left: 5px;
// `;
const NotesCountBadge = (props: EuiBadgeProps) => (
  <EuiBadge {...props} style={{ marginLeft: '5px' }} />
);

NotesCountBadge.displayName = 'NotesCountBadge';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;

export const StarIcon = pure<{
  isFavorite: boolean;
  timelineId: string;
  updateIsFavorite: UpdateIsFavorite;
}>(({ isFavorite, timelineId: id, updateIsFavorite }) => (
  // TODO: 1 error is: Visible, non-interactive elements with click handlers must have at least one keyboard listener
  // TODO: 2 error is: Elements with the 'button' interactive role must be focusable
  // TODO: Investigate this error
  // eslint-disable-next-line
  <div role="button" onClick={() => updateIsFavorite({ id, isFavorite: !isFavorite })}>
    {isFavorite ? (
      <EuiToolTip data-test-subj="timeline-favorite-filled-star-tool-tip" content={i18n.FAVORITE}>
        <StyledStar data-test-subj="timeline-favorite-filled-star" type="starFilled" size="l" />
      </EuiToolTip>
    ) : (
      <EuiToolTip content={i18n.NOT_A_FAVORITE}>
        <StyledStar data-test-subj="timeline-favorite-empty-star" type="starEmpty" size="l" />
      </EuiToolTip>
    )}
  </div>
));

StarIcon.displayName = 'StarIcon';

export const Description = pure<{
  description: string;
  timelineId: string;
  updateDescription: UpdateDescription;
}>(({ description, timelineId, updateDescription }) => (
  <EuiToolTip data-test-subj="timeline-description-tool-tip" content={i18n.DESCRIPTION_TOOL_TIP}>
    <DescriptionContainer data-test-subj="description-container">
      <EuiFieldText
        aria-label={i18n.TIMELINE_DESCRIPTION}
        data-test-subj="timeline-description"
        fullWidth={true}
        onChange={e => updateDescription({ id: timelineId, description: e.target.value })}
        placeholder={i18n.DESCRIPTION}
        spellCheck={true}
        value={description}
      />
    </DescriptionContainer>
  </EuiToolTip>
));

Description.displayName = 'Description';

export const Name = pure<{ timelineId: string; title: string; updateTitle: UpdateTitle }>(
  ({ timelineId, title, updateTitle }) => (
    <EuiToolTip data-test-subj="timeline-title-tool-tip" content={i18n.TITLE}>
      <NameField
        aria-label={i18n.TIMELINE_TITLE}
        data-test-subj="timeline-title"
        onChange={e => updateTitle({ id: timelineId, title: e.target.value })}
        placeholder={i18n.UNTITLED_TIMELINE}
        spellCheck={true}
        value={title}
      />
    </EuiToolTip>
  )
);

Name.displayName = 'Name';

export const NewTimeline = pure<{
  createTimeline: CreateTimeline;
  onClosePopover: () => void;
  timelineId: string;
}>(({ createTimeline, onClosePopover, timelineId }) => (
  <EuiButtonEmpty
    data-test-subj="timeline-new"
    color="text"
    iconSide="left"
    iconType="plusInCircle"
    onClick={() => {
      createTimeline({ id: timelineId, show: true });
      onClosePopover();
    }}
  >
    {i18n.NEW_TIMELINE}
  </EuiButtonEmpty>
));

NewTimeline.displayName = 'NewTimeline';

interface NotesButtonProps {
  animate?: boolean;
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  size: 's' | 'l';
  showNotes: boolean;
  toggleShowNotes: () => void;
  text?: string;
  toolTip?: string;
  updateNote: UpdateNote;
}

const getNewNoteId = (): string => uuid.v4();

const NotesButtonIcon = styled(EuiButtonIcon)`
  svg {
    height: 19px;
    width: 19px;
  }
`;

const NotesIcon = pure<{ count: number }>(({ count }) => (
  <NotesButtonIcon
    aria-label={i18n.NOTES}
    color={count > 0 ? 'primary' : 'subdued'}
    data-test-subj="timeline-notes-icon"
    size="m"
    iconType="editorComment"
  />
));

NotesIcon.displayName = 'NotesIcon';

const LargeNotesButton = pure<{ noteIds: string[]; text?: string; toggleShowNotes: () => void }>(
  ({ noteIds, text, toggleShowNotes }) => (
    <EuiButton
      data-test-subj="timeline-notes-button-large"
      onClick={() => toggleShowNotes()}
      size="m"
    >
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiIcon color="subdued" size="m" type="editorComment" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {text && text.length ? <LabelText>{text}</LabelText> : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <NotesCountBadge data-test-subj="timeline-notes-count" color="hollow">
            {noteIds.length}
          </NotesCountBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  )
);

LargeNotesButton.displayName = 'LargeNotesButton';

const SmallNotesButton = pure<{ noteIds: string[]; toggleShowNotes: () => void }>(
  ({ noteIds, toggleShowNotes }) => (
    <SmallNotesButtonContainer
      data-test-subj="timeline-notes-button-small"
      onClick={() => toggleShowNotes()}
      role="button"
    >
      <NotesIcon count={noteIds.length} />
    </SmallNotesButtonContainer>
  )
);

SmallNotesButton.displayName = 'SmallNotesButton';

/**
 * The internal implementation of the `NotesButton`
 */
const NotesButtonComponent = pure<NotesButtonProps>(
  ({
    animate = true,
    associateNote,
    getNotesByIds,
    noteIds,
    showNotes,
    size,
    toggleShowNotes,
    text,
    updateNote,
  }) => (
    <ButtonContainer animate={animate} data-test-subj="timeline-notes-button-container">
      <>
        {size === 'l' ? (
          <LargeNotesButton noteIds={noteIds} text={text} toggleShowNotes={toggleShowNotes} />
        ) : (
          <SmallNotesButton noteIds={noteIds} toggleShowNotes={toggleShowNotes} />
        )}
        {size === 'l' && showNotes ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={NOTES_PANEL_WIDTH} onClose={toggleShowNotes}>
              <Notes
                associateNote={associateNote}
                getNotesByIds={getNotesByIds}
                noteIds={noteIds}
                getNewNoteId={getNewNoteId}
                updateNote={updateNote}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    </ButtonContainer>
  )
);

NotesButtonComponent.displayName = 'NotesButtonComponent';

export const NotesButton = pure<NotesButtonProps>(
  ({
    animate = true,
    associateNote,
    getNotesByIds,
    noteIds,
    showNotes,
    size,
    toggleShowNotes,
    toolTip,
    text,
    updateNote,
  }) =>
    showNotes ? (
      <NotesButtonComponent
        animate={animate}
        associateNote={associateNote}
        getNotesByIds={getNotesByIds}
        noteIds={noteIds}
        showNotes={showNotes}
        size={size}
        toggleShowNotes={toggleShowNotes}
        text={text}
        updateNote={updateNote}
      />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <NotesButtonComponent
          animate={animate}
          associateNote={associateNote}
          getNotesByIds={getNotesByIds}
          noteIds={noteIds}
          showNotes={showNotes}
          size={size}
          toggleShowNotes={toggleShowNotes}
          text={text}
          updateNote={updateNote}
        />
      </EuiToolTip>
    )
);

NotesButton.displayName = 'NotesButton';
