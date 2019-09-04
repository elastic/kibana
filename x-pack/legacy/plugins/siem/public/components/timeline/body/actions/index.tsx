/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';

import { eventHasNotes, getPinTooltip } from '../helpers';
import * as i18n from '../translations';
import { NotesButton } from '../../properties/helpers';
import { TimelineCell, TimelineCellContent, TimelineRowGroupActions } from '../../styles';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../../pin';
import { Note } from '../../../../lib/note';

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
    <TimelineRowGroupActions
      actionsColumnWidth={actionsColumnWidth}
      data-test-subj="event-actions-container"
    >
      {showCheckboxes && (
        <TimelineCell data-test-subj="select-event-container">
          <TimelineCellContent textAlign="center">
            <EuiCheckbox
              data-test-subj="select-event"
              id={eventId}
              checked={checked}
              onChange={noop}
            />
          </TimelineCellContent>
        </TimelineCell>
      )}

      <TimelineCell>
        <TimelineCellContent textAlign="center">
          {loading && <EuiLoadingSpinner size="m" />}

          {!loading && (
            <EuiButtonIcon
              aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
              data-test-subj="expand-event"
              iconType={expanded ? 'arrowDown' : 'arrowRight'}
              id={eventId}
              onClick={onEventToggled}
            />
          )}
        </TimelineCellContent>
      </TimelineCell>

      {!isEventViewer && (
        <>
          <TimelineCell>
            <TimelineCellContent textAlign="center">
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
            </TimelineCellContent>
          </TimelineCell>

          <TimelineCell>
            <TimelineCellContent textAlign="center">
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
            </TimelineCellContent>
          </TimelineCell>
        </>
      )}
    </TimelineRowGroupActions>
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
