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
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { requestIdleCallbackViaScheduler } from '../../../../lib/helpers/scheduler';
import { StatefulEventChild } from './stateful_event_child';
import { eventIsPinned } from '../helpers';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
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

/**
 * This is the default row height whenever it is a plain row renderer and not a custom row height.
 * We use this value when we do not know the height of a particular row.
 */
const DEFAULT_ROW_HEIGHT = '27px';

/**
 * This is the default margin size from the EmptyRow below and is the top and bottom
 * margin added together.
 * If you change margin: 5px 0 5px 0; within EmptyRow styled component, then please
 * update this value
 */
const EMPTY_ROW_MARGIN_TOP_BOTTOM = 10;

/**
 * This is the top offset in pixels of the top part of the timeline. The UI area where you do your
 * drag and drop and filtering.  It is a positive number in pixels of _PART_ of the header but not
 * the entire header. We leave room for some rows to render behind the drag and drop so they might be
 * visible by the time the user scrolls upwards. All other DOM elements are replaced with their "blank"
 * rows.
 */
const TOP_OFFSET = 50;

/**
 * This is the bottom offset in pixels of the bottom part of the timeline. The UI area right below the
 * timeline which is the footer.  Since the footer is so incredibly small we don't have enough room to
 * render around 5 rows below the timeline to get the user the best chance of always scrolling without seeing
 * "blank rows". The negative number is to give the bottom of the browser window a bit of invisible space to
 * keep around 5 rows rendering below it. All other DOM elements are replaced with their "blank"
 * rows.
 */
const BOTTOM_OFFSET = -500;

/**
 * This is missing the height props intentionally for performance reasons that
 * you can see here:
 * https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
 *
 * We inline the height style for performance reasons directly on the component.
 */
export const EmptyRow = styled.div`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  width: 100%;
  border: ${props => `1px solid ${props.theme.eui.euiColorLightShade}`};
  border-radius: 5px;
  margin: 5px 0 5px 0;
`;

export class StatefulEvent extends React.Component<Props, State> {
  private _isMounted: boolean = false;

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
    this._isMounted = true;

    requestIdleCallbackViaScheduler(
      () => {
        if (!this.state.initialRender && this._isMounted) {
          this.setState({ initialRender: true });
        }
      },
      { timeout: this.props.maxDelay ? this.props.maxDelay : 0 }
    );
  }

  componentWillUnmount() {
    this._isMounted = false;
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
      isEventViewer = false,
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
      // height is being inlined directly in here because of performance with StyledComponents
      // involving quick and constant changes to the DOM.
      // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
      return <EmptyRow style={{ height: DEFAULT_ROW_HEIGHT }}></EmptyRow>;
    }

    return (
      <VisibilitySensor
        partialVisibility={true}
        scrollCheck={true}
        offset={{ top: TOP_OFFSET, bottom: BOTTOM_OFFSET }}
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
                    className={STATEFUL_EVENT_CSS_CLASS_NAME}
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
                          isEventViewer={isEventViewer}
                          loading={loading}
                          onColumnResized={onColumnResized}
                          onToggleExpanded={this.onToggleExpanded}
                          onUnPinEvent={onUnPinEvent}
                          pinnedEventIds={pinnedEventIds}
                          showNotes={!!this.state.showNotes[event._id]}
                          timelineId={timelineId}
                          onToggleShowNotes={this.onToggleShowNotes}
                          updateNote={updateNote}
                        />
                      ),
                      timelineId,
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
            // Height place holder for visibility detection as well as re-rendering sections.
            const height =
              this.divElement != null
                ? `${this.divElement.clientHeight - EMPTY_ROW_MARGIN_TOP_BOTTOM}px`
                : DEFAULT_ROW_HEIGHT;

            // height is being inlined directly in here because of performance with StyledComponents
            // involving quick and constant changes to the DOM.
            // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
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
    if (!eventIsPinned({ eventId, pinnedEventIds: this.props.pinnedEventIds })) {
      onPinEvent(eventId); // pin the event, because it has notes
    }
  };
}
