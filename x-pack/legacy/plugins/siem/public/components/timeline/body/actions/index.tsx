/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import styled from 'styled-components';

import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../../pin';
import { NotesButton } from '../../properties/helpers';
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

const ActionsContainer = styled.div<{ actionsColumnWidth: number }>`
  overflow: hidden;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth}px;
`;

ActionsContainer.displayName = 'ActionsContainer';

const ActionLoading = styled(EuiLoadingSpinner)`
  position: relative;
  top: 3px;
`;

ActionLoading.displayName = 'ActionLoading';

const PinContainer = styled.div`
  position: relative;
  top: -1px;
  width: 27px;
`;

PinContainer.displayName = 'PinContainer';

const SelectEventContainer = styled(EuiFlexItem)`
  padding: 4px 0 0 7px;
`;

SelectEventContainer.displayName = 'SelectEventContainer';

const NotesButtonContainer = styled(EuiFlexItem)`
  position: relative;
  top: -1px;
`;

NotesButtonContainer.displayName = 'NotesButtonContainer';

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
    <ActionsContainer
      actionsColumnWidth={actionsColumnWidth}
      data-test-subj="event-actions-container"
    >
      <EuiFlexGroup
        alignItems="flexStart"
        data-test-subj="event-actions"
        direction="row"
        gutterSize="none"
        justifyContent="spaceBetween"
      >
        {showCheckboxes && (
          <SelectEventContainer data-test-subj="select-event-container" grow={false}>
            <EuiCheckbox
              data-test-subj="select-event"
              id={eventId}
              checked={checked}
              onChange={noop}
            />
          </SelectEventContainer>
        )}

        <EuiFlexItem grow={false}>
          <div>
            {loading && <ActionLoading size="m" />}
            {!loading && (
              <EuiButtonIcon
                aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
                color="subdued"
                iconType={expanded ? 'arrowDown' : 'arrowRight'}
                data-test-subj="expand-event"
                id={eventId}
                onClick={onEventToggled}
                size="s"
              />
            )}
          </div>
        </EuiFlexItem>

        {!isEventViewer && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                data-test-subj="timeline-action-pin-tool-tip"
                content={getPinTooltip({
                  isPinned: eventIsPinned,
                  eventHasNotes: eventHasNotes(noteIds),
                })}
              >
                <PinContainer>
                  <Pin
                    allowUnpinning={!eventHasNotes(noteIds)}
                    pinned={eventIsPinned}
                    data-test-subj="pin-event"
                    onClick={onPinClicked}
                  />
                </PinContainer>
              </EuiToolTip>
            </EuiFlexItem>

            <NotesButtonContainer grow={false}>
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
            </NotesButtonContainer>
          </>
        )}
      </EuiFlexGroup>
    </ActionsContainer>
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
