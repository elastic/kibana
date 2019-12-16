/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import * as React from 'react';

import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../../pin';
import { NotesButton } from '../../properties/helpers';
import { EventsLoading, EventsTd, EventsTdContent, EventsTdGroupActions } from '../../styles';
import { eventHasNotes, getPinTooltip } from '../helpers';
import * as i18n from '../translations';
import { OnRowSelected } from '../../events';
import { TimelineNonEcsData } from '../../../../graphql/types';

export interface TimelineActionProps {
  eventId: string;
  data: TimelineNonEcsData[];
}

export interface TimelineAction {
  getAction: ({ eventId, data }: TimelineActionProps) => JSX.Element;
  width: number;
  id: string;
}

interface Props {
  actionsColumnWidth: number;
  additionalActions?: JSX.Element[];
  associateNote: AssociateNote;
  checked: boolean;
  onRowSelected: OnRowSelected;
  expanded: boolean;
  eventId: string;
  eventIsPinned: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  noteIds: string[];
  onEventToggled: () => void;
  onPinClicked: () => void;
  showNotes: boolean;
  showCheckboxes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const emptyNotes: string[] = [];

export const Actions = React.memo<Props>(
  ({
    actionsColumnWidth,
    additionalActions,
    associateNote,
    checked,
    expanded,
    eventId,
    eventIsPinned,
    getNotesByIds,
    isEventViewer = false,
    loading = false,
    loadingEventIds,
    noteIds,
    onEventToggled,
    onPinClicked,
    onRowSelected,
    showCheckboxes,
    showNotes,
    toggleShowNotes,
    updateNote,
  }) => (
    <EventsTdGroupActions
      actionsColumnWidth={actionsColumnWidth}
      data-test-subj="event-actions-container"
    >
      {showCheckboxes && (
        <EventsTd data-test-subj="select-event-container">
          <EventsTdContent textAlign="center">
            {loadingEventIds.includes(eventId) ? (
              <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
            ) : (
              <EuiCheckbox
                data-test-subj="select-event"
                id={eventId}
                checked={checked}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  onRowSelected({
                    eventIds: [eventId],
                    isSelected: event.currentTarget.checked,
                  });
                }}
              />
            )}
          </EventsTdContent>
        </EventsTd>
      )}

      <>{additionalActions}</>

      <EventsTd>
        <EventsTdContent textAlign="center">
          {loading && <EventsLoading />}

          {!loading && (
            <EuiButtonIcon
              aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
              data-test-subj="expand-event"
              iconType={expanded ? 'arrowDown' : 'arrowRight'}
              id={eventId}
              onClick={onEventToggled}
            />
          )}
        </EventsTdContent>
      </EventsTd>

      {!isEventViewer && (
        <>
          <EventsTd>
            <EventsTdContent textAlign="center">
              <EuiToolTip
                data-test-subj="timeline-action-pin-tool-tip"
                content={getPinTooltip({
                  isPinned: eventIsPinned,
                  eventHasNotes: eventHasNotes(noteIds),
                })}
              >
                <Pin
                  allowUnpinning={!eventHasNotes(noteIds)}
                  data-test-subj="pin-event"
                  onClick={onPinClicked}
                  pinned={eventIsPinned}
                />
              </EuiToolTip>
            </EventsTdContent>
          </EventsTd>

          <EventsTd>
            <EventsTdContent textAlign="center">
              <NotesButton
                animate={false}
                associateNote={associateNote}
                data-test-subj="add-note"
                getNotesByIds={getNotesByIds}
                noteIds={noteIds || emptyNotes}
                showNotes={showNotes}
                size="s"
                toggleShowNotes={toggleShowNotes}
                toolTip={i18n.NOTES_TOOLTIP}
                updateNote={updateNote}
              />
            </EventsTdContent>
          </EventsTd>
        </>
      )}
    </EventsTdGroupActions>
  ),
  (nextProps, prevProps) => {
    return (
      prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
      prevProps.checked === nextProps.checked &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.eventId === nextProps.eventId &&
      prevProps.eventIsPinned === nextProps.eventIsPinned &&
      prevProps.loading === nextProps.loading &&
      prevProps.loadingEventIds === nextProps.loadingEventIds &&
      prevProps.noteIds === nextProps.noteIds &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showNotes === nextProps.showNotes
    );
  }
);
Actions.displayName = 'Actions';
