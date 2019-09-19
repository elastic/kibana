/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonIcon, EuiCheckbox, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';

import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../../pin';
import { NotesButton } from '../../properties/helpers';
import { EventsLoading, EventsTd, EventsTdContent, EventsTdGroupActions } from '../../styles';
import { eventHasNotes, getPinTooltip } from '../helpers';
import * as i18n from '../translations';

interface Props {
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  checked: boolean;
  expanded: boolean;
  eventId: string;
  eventIsPinned: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loading: boolean;
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
    associateNote,
    checked,
    expanded,
    eventId,
    eventIsPinned,
    getNotesByIds,
    isEventViewer = false,
    loading = false,
    noteIds,
    onEventToggled,
    onPinClicked,
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
            <EuiCheckbox
              data-test-subj="select-event"
              id={eventId}
              checked={checked}
              onChange={noop}
            />
          </EventsTdContent>
        </EventsTd>
      )}

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
      prevProps.noteIds === nextProps.noteIds &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showNotes === nextProps.showNotes
    );
  }
);
Actions.displayName = 'Actions';
