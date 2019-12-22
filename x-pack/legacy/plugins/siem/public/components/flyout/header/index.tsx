/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { isEmpty, get } from 'lodash/fp';
import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import {
  appSelectors,
  inputsModel,
  inputsSelectors,
  State,
  timelineSelectors,
} from '../../../store';
import { defaultHeaders } from '../../timeline/body/column_headers/default_headers';
import { Properties } from '../../timeline/properties';
import { appActions } from '../../../store/app';
import { inputsActions } from '../../../store/inputs';
import { timelineActions } from '../../../store/actions';
import { timelineDefaults, TimelineModel } from '../../../store/timeline/model';
import { DEFAULT_TIMELINE_WIDTH } from '../../timeline/body/helpers';
import { InputsModelId } from '../../../store/inputs/constants';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & PropsFromRedux;

const StatefulFlyoutHeader = React.memo<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    isFavorite,
    isDataInTimeline,
    isDatepickerLocked,
    title,
    width = DEFAULT_TIMELINE_WIDTH,
    noteIds,
    notesById,
    timelineId,
    toggleLock,
    updateDescription,
    updateIsFavorite,
    updateNote,
    updateTitle,
    usersViewing,
  }) => {
    const getNotesByIds = useCallback(
      (noteIdsVar: string[]): Note[] => appSelectors.getNotes(notesById, noteIdsVar),
      [notesById]
    );
    return (
      <Properties
        associateNote={associateNote}
        createTimeline={createTimeline}
        description={description}
        getNotesByIds={getNotesByIds}
        isDataInTimeline={isDataInTimeline}
        isDatepickerLocked={isDatepickerLocked}
        isFavorite={isFavorite}
        title={title}
        noteIds={noteIds}
        timelineId={timelineId}
        toggleLock={toggleLock}
        updateDescription={updateDescription}
        updateIsFavorite={updateIsFavorite}
        updateTitle={updateTitle}
        updateNote={updateNote}
        usersViewing={usersViewing}
        width={width}
      />
    );
  }
);

StatefulFlyoutHeader.displayName = 'StatefulFlyoutHeader';

const emptyHistory: History[] = []; // stable reference

const emptyNotesId: string[] = []; // stable reference

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
    const {
      dataProviders,
      description = '',
      isFavorite = false,
      kqlQuery,
      title = '',
      noteIds = emptyNotesId,
      width = DEFAULT_TIMELINE_WIDTH,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      notesById: getNotesByIds(state),
      history,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
      isDatepickerLocked: globalInput.linkTo.includes('timeline'),
      noteIds,
      title,
      width,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  associateNote: (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
  applyDeltaToWidth: ({
    id,
    delta,
    bodyClientWidthPixels,
    maxWidthPercent,
    minWidthPixels,
  }: {
    id: string;
    delta: number;
    bodyClientWidthPixels: number;
    maxWidthPercent: number;
    minWidthPixels: number;
  }) =>
    dispatch(
      timelineActions.applyDeltaToWidth({
        id,
        delta,
        bodyClientWidthPixels,
        maxWidthPercent,
        minWidthPixels,
      })
    ),
  createTimeline: ({ id, show }: { id: string; show?: boolean }) =>
    dispatch(
      timelineActions.createTimeline({
        id,
        columns: defaultHeaders,
        show,
      })
    ),
  updateDescription: ({ id, description }: { id: string; description: string }) =>
    dispatch(timelineActions.updateDescription({ id, description })),
  updateIsFavorite: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
    dispatch(timelineActions.updateIsFavorite({ id, isFavorite })),
  updateIsLive: ({ id, isLive }: { id: string; isLive: boolean }) =>
    dispatch(timelineActions.updateIsLive({ id, isLive })),
  updateNote: (note: Note) => dispatch(appActions.updateNote({ note })),
  updateTitle: ({ id, title }: { id: string; title: string }) =>
    dispatch(timelineActions.updateTitle({ id, title })),
  toggleLock: ({ linkToId }: { linkToId: InputsModelId }) =>
    dispatch(inputsActions.toggleTimelineLinkTo({ linkToId })),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const FlyoutHeader = connector(StatefulFlyoutHeader);
