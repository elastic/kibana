/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import uuid from 'uuid';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent } from '../../events';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_headers/column_header';
import { DataDrivenColumns } from '../data_driven_columns';
import { eventHasNotes, eventIsPinned, getPinOnClick } from '../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';

interface Props {
  _id: string;
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  loading: boolean;
  onColumnResized: OnColumnResized;
  onEventToggled: () => void;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  showNotes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

export class EventColumnView extends React.PureComponent<Props> {
  public render() {
    const {
      _id,
      actionsColumnWidth,
      associateNote,
      columnHeaders,
      columnRenderers,
      data,
      eventIdToNoteIds,
      expanded,
      getNotesByIds,
      loading,
      onColumnResized,
      onEventToggled,
      onPinEvent,
      onUnPinEvent,
      pinnedEventIds,
      showNotes,
      toggleShowNotes,
      updateNote,
    } = this.props;
    return (
      <EuiFlexGroup data-test-subj="event-column-view" gutterSize="none">
        <EuiFlexItem data-test-subj="actions-column-item" grow={false}>
          <Actions
            actionsColumnWidth={actionsColumnWidth}
            associateNote={associateNote}
            checked={false}
            expanded={expanded}
            data-test-subj="actions"
            eventId={_id}
            eventIsPinned={eventIsPinned({
              eventId: _id,
              pinnedEventIds,
            })}
            getNotesByIds={getNotesByIds}
            loading={loading}
            noteIds={eventIdToNoteIds[_id] || emptyNotes}
            onEventToggled={onEventToggled}
            onPinClicked={getPinOnClick({
              allowUnpinning: !eventHasNotes(eventIdToNoteIds[_id]),
              eventId: _id,
              onPinEvent,
              onUnPinEvent,
              pinnedEventIds,
            })}
            showCheckboxes={false}
            showNotes={showNotes}
            toggleShowNotes={toggleShowNotes}
            updateNote={updateNote}
          />
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="event-columns-item" grow={false}>
          <DataDrivenColumns
            _id={_id}
            columnHeaders={columnHeaders}
            columnRenderers={columnRenderers}
            data={data}
            onColumnResized={onColumnResized}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
