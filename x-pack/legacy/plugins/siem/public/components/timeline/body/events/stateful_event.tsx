/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import uuid from 'uuid';

import VisibilitySensor from 'react-visibility-sensor';
import styled from 'styled-components';
import { BrowserFields } from '../../../../containers/source';
import { TimelineDetailsComponentQuery } from '../../../../containers/timeline/details';
import { TimelineItem, DetailItem } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent, OnUpdateColumns } from '../../events';
import { ExpandableEvent } from '../../expandable_event';
import { ColumnHeader } from '../column_headers/column_header';

import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { requestIdleCallbackViaScheduler } from '../../../../lib/helpers/scheduler';
import { StatefulEventChild } from './stateful_event_child';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
  maxDelay?: number;
}

interface State {
  expanded: { [eventId: string]: boolean };
  showNotes: { [eventId: string]: boolean };
  initialRender: boolean;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: DetailItem[] = [];

export const EmptyRow = styled.div`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  width: 100%;
  border: ${props => `1px solid ${props.theme.eui.euiColorLightShade}`};
  border-radius: 5px;
  margin-top: 5px;
  margin-bottom: 5px;
`;

export class StatefulEvent extends React.Component<Props, State> {
  public readonly state: State = {
    expanded: {},
    showNotes: {},
    initialRender: false,
  };

  public divElement: HTMLDivElement | null = null;

  /**
   * Incrementally loads the events when it mounts by trying to
   * see if it resides within a window frame and if it is it will
   * indicate to React that it should render its self by setting
   * its initialRender to true.
   */
  public componentDidMount() {
    requestIdleCallbackViaScheduler(
      () => {
        if (!this.state.initialRender) {
          this.setState({ initialRender: true });
        }
      },
      { timeout: this.props.maxDelay ? this.props.maxDelay : 0 }
    );
  }

  public render() {
    const {
      actionsColumnWidth,
      addNoteToEvent,
      browserFields,
      columnHeaders,
      columnRenderers,
      event,
      eventIdToNoteIds,
      getNotesByIds,
      onColumnResized,
      onPinEvent,
      onUpdateColumns,
      onUnPinEvent,
      pinnedEventIds,
      rowRenderers,
      timelineId,
      toggleColumn,
      updateNote,
    } = this.props;

    // If we are not ready to render yet, just return null
    // see componentDidMount() for when it schedules the first
    // time this stateful component should be rendered.
    if (!this.state.initialRender) {
      return <EmptyRow style={{ height: '27px' }}></EmptyRow>;
    }

    return (
      <VisibilitySensor
        partialVisibility={true}
        scrollCheck={true}
        offset={{ top: 50, bottom: -500 }}
      >
        {({ isVisible }) => {
          if (isVisible) {
            return (
              <TimelineDetailsComponentQuery
                sourceId="default"
                indexName={event._index!}
                eventId={event._id}
                executeQuery={!!this.state.expanded[event._id]}
              >
                {({ detailsData, loading }) => (
                  <div
                    data-test-subj="event"
                    ref={divElement => {
                      if (divElement != null) {
                        this.divElement = divElement;
                      }
                    }}
                  >
                    {getRowRenderer(event.ecs, rowRenderers).renderRow({
                      browserFields,
                      data: event.ecs,
                      children: (
                        <StatefulEventChild
                          id={event._id}
                          actionsColumnWidth={actionsColumnWidth}
                          associateNote={this.associateNote}
                          addNoteToEvent={addNoteToEvent}
                          onPinEvent={onPinEvent}
                          columnHeaders={columnHeaders}
                          columnRenderers={columnRenderers}
                          expanded={!!this.state.expanded[event._id]}
                          data={event.data}
                          eventIdToNoteIds={eventIdToNoteIds}
                          getNotesByIds={getNotesByIds}
                          loading={loading}
                          onColumnResized={onColumnResized}
                          onToggleExpanded={this.onToggleExpanded}
                          onUnPinEvent={onUnPinEvent}
                          pinnedEventIds={pinnedEventIds}
                          showNotes={!!this.state.showNotes[event._id]}
                          onToggleShowNotes={this.onToggleShowNotes}
                          updateNote={updateNote}
                        />
                      ),
                    })}
                    <EuiFlexItem data-test-subj="event-details" grow={true}>
                      <ExpandableEvent
                        browserFields={browserFields}
                        columnHeaders={columnHeaders}
                        id={event._id}
                        event={detailsData || emptyDetails}
                        forceExpand={!!this.state.expanded[event._id] && !loading}
                        onUpdateColumns={onUpdateColumns}
                        timelineId={timelineId}
                        toggleColumn={toggleColumn}
                      />
                    </EuiFlexItem>
                  </div>
                )}
              </TimelineDetailsComponentQuery>
            );
          } else {
            // height place holder for visibility detection as well as re-rendering sections
            const height =
              this.divElement != null ? `${this.divElement.clientHeight - 10}px` : '27px';
            return <EmptyRow style={{ height }}></EmptyRow>;
          }
        }}
      </VisibilitySensor>
    );
  }

  private onToggleShowNotes = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      showNotes: {
        ...state.showNotes,
        [eventId]: !state.showNotes[eventId],
      },
    }));
  };

  private onToggleExpanded = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      expanded: {
        ...state.expanded,
        [eventId]: !state.expanded[eventId],
      },
    }));
  };

  private associateNote = (
    eventId: string,
    addNoteToEvent: AddNoteToEvent,
    onPinEvent: OnPinEvent
  ): ((noteId: string) => void) => (noteId: string) => {
    addNoteToEvent({ eventId, noteId });
    onPinEvent(eventId); // pin the event, because it has notes
  };
}
