/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';

import { Note } from '../../../lib/note';
import { InputsModelId } from '../../../store/inputs/constants';
import { AssociateNote, UpdateNote } from '../../notes/helpers';

import { TimelineProperties } from './styles';
import { PropertiesRight } from './properties_right';
import { PropertiesLeft } from './properties_left';

type CreateTimeline = ({ id, show }: { id: string; show?: boolean }) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
type ToggleLock = ({ linkToId }: { linkToId: InputsModelId }) => void;

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  isDataInTimeline: boolean;
  isDatepickerLocked: boolean;
  isFavorite: boolean;
  noteIds: string[];
  timelineId: string;
  title: string;
  toggleLock: ToggleLock;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateNote: UpdateNote;
  updateTitle: UpdateTitle;
  usersViewing: string[];
  width: number;
}

const rightGutter = 60; // px
export const datePickerThreshold = 600;
export const showNotesThreshold = 810;
export const showDescriptionThreshold = 970;

const starIconWidth = 30;
const nameWidth = 155;
const descriptionWidth = 165;
const noteWidth = 130;
const settingsWidth = 50;

/** Displays the properties of a timeline, i.e. name, description, notes, etc */
export const Properties = React.memo<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    getNotesByIds,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    noteIds,
    timelineId,
    title,
    toggleLock,
    updateDescription,
    updateIsFavorite,
    updateNote,
    updateTitle,
    usersViewing,
    width,
  }) => {
    const [showActions, setShowActions] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    const onButtonClick = useCallback(() => {
      setShowActions(!showActions);
    }, [showActions]);

    const onToggleShowNotes = useCallback(() => {
      setShowNotes(!showNotes);
    }, [showNotes]);

    const onClosePopover = useCallback(() => {
      setShowActions(false);
    }, []);

    const onOpenTimelineModal = useCallback(() => {
      onClosePopover();
      setShowTimelineModal(true);
    }, []);

    const onCloseTimelineModal = useCallback(() => {
      setShowTimelineModal(false);
    }, []);

    const datePickerWidth =
      width -
      rightGutter -
      starIconWidth -
      nameWidth -
      (width >= showDescriptionThreshold ? descriptionWidth : 0) -
      noteWidth -
      settingsWidth;

    // Passing the styles directly to the component because the width is
    // being calculated and is recommended by Styled Components for performance
    // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
    return (
      <TimelineProperties data-test-subj="timeline-properties" style={{ width }}>
        <PropertiesLeft
          associateNote={associateNote}
          datePickerWidth={
            datePickerWidth > datePickerThreshold ? datePickerThreshold : datePickerWidth
          }
          description={description}
          getNotesByIds={getNotesByIds}
          isDatepickerLocked={isDatepickerLocked}
          isFavorite={isFavorite}
          noteIds={noteIds}
          showDescription={width >= showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width >= showNotesThreshold}
          timelineId={timelineId}
          title={title}
          toggleLock={() => {
            toggleLock({ linkToId: 'timeline' });
          }}
          updateDescription={updateDescription}
          updateIsFavorite={updateIsFavorite}
          updateNote={updateNote}
          updateTitle={updateTitle}
          onToggleShowNotes={onToggleShowNotes}
        />
        <PropertiesRight
          associateNote={associateNote}
          createTimeline={createTimeline}
          description={description}
          getNotesByIds={getNotesByIds}
          isDataInTimeline={isDataInTimeline}
          noteIds={noteIds}
          showActions={showActions}
          showDescription={width < showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width < showNotesThreshold}
          showTimelineModal={showTimelineModal}
          showUsersView={title.length > 0}
          timelineId={timelineId}
          updateDescription={updateDescription}
          updateNote={updateNote}
          usersViewing={usersViewing}
          onButtonClick={onButtonClick}
          onClosePopover={onClosePopover}
          onCloseTimelineModal={onCloseTimelineModal}
          onOpenTimelineModal={onOpenTimelineModal}
          onToggleShowNotes={onToggleShowNotes}
        />
      </TimelineProperties>
    );
  }
);

Properties.displayName = 'Properties';
