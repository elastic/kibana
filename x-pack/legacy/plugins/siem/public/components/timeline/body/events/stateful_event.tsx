/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import uuid from 'uuid';
import VisibilitySensor from 'react-visibility-sensor';

import { BrowserFields } from '../../../../containers/source';
import { TimelineDetailsComponentQuery } from '../../../../containers/timeline/details';
import { TimelineItem, DetailItem } from '../../../../graphql/types';
import { requestIdleCallbackViaScheduler } from '../../../../lib/helpers/scheduler';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { SkeletonRow } from '../../../skeleton_row';
import { OnColumnResized, OnPinEvent, OnUnPinEvent, OnUpdateColumns } from '../../events';
import { ExpandableEvent } from '../../expandable_event';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, OFFSET_SCROLLBAR } from '../../styles';
import { useTimelineWidthContext } from '../../timeline_context';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { RowRenderer } from '../renderers/row_renderer';
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
  isEventViewer?: boolean;
  maxDelay?: number;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  isEventPinned: boolean;
  rowRenderers: RowRenderer[];
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: DetailItem[] = [];

/**
 * This is the default row height whenever it is a plain row renderer and not a custom row height.
 * We use this value when we do not know the height of a particular row.
 */
const DEFAULT_ROW_HEIGHT = '32px';

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

interface AttributesProps {
  children: React.ReactNode;
}

const Attributes = React.memo<AttributesProps>(({ children }) => {
  const width = useTimelineWidthContext();

  // Passing the styles directly to the component because the width is
  // being calculated and is recommended by Styled Components for performance
  // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
  return (
    <EventsTrSupplement
      className="siemEventsTable__trSupplement--attributes"
      data-test-subj="event-details"
      style={{ width: `${width - OFFSET_SCROLLBAR}px` }}
    >
      {children}
    </EventsTrSupplement>
  );
});

export const StatefulEvent = React.memo<Props>(
  ({
    actionsColumnWidth,
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    event,
    eventIdToNoteIds,
    getNotesByIds,
    isEventViewer = false,
    isEventPinned = false,
    maxDelay = 0,
    onColumnResized,
    onPinEvent,
    onUnPinEvent,
    onUpdateColumns,
    rowRenderers,
    timelineId,
    toggleColumn,
    updateNote,
  }) => {
    const [expanded, setExpanded] = useState<{ [eventId: string]: boolean }>({});
    const [initialRender, setInitialRender] = useState(false);
    const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});

    const divElement = useRef<HTMLDivElement | null>(null);

    const onToggleShowNotes = useCallback(() => {
      const eventId = event._id;
      setShowNotes({ ...showNotes, [eventId]: !showNotes[eventId] });
    }, [event, showNotes]);

    const onToggleExpanded = useCallback(() => {
      const eventId = event._id;
      setExpanded({
        ...expanded,
        [eventId]: !expanded[eventId],
      });
    }, [event, expanded]);

    const associateNote = useCallback(
      (noteId: string) => {
        addNoteToEvent({ eventId: event._id, noteId });
        if (!isEventPinned) {
          onPinEvent(event._id); // pin the event, because it has notes
        }
      },
      [addNoteToEvent, event, isEventPinned, onPinEvent]
    );

    /**
     * Incrementally loads the events when it mounts by trying to
     * see if it resides within a window frame and if it is it will
     * indicate to React that it should render its self by setting
     * its initialRender to true.
     */
    useEffect(() => {
      let _isMounted = true;

      requestIdleCallbackViaScheduler(
        () => {
          if (!initialRender && _isMounted) {
            setInitialRender(true);
          }
        },
        { timeout: maxDelay }
      );
      return () => {
        _isMounted = false;
      };
    }, []);

    // Number of current columns plus one for actions.
    const columnCount = columnHeaders.length + 1;

    // If we are not ready to render yet, just return null
    // see useEffect() for when it schedules the first
    // time this stateful component should be rendered.
    if (!initialRender) {
      return <SkeletonRow cellCount={columnCount} />;
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
                executeQuery={!!expanded[event._id]}
              >
                {({ detailsData, loading }) => (
                  <EventsTrGroup
                    className={STATEFUL_EVENT_CSS_CLASS_NAME}
                    data-test-subj="event"
                    ref={c => {
                      if (c != null) {
                        divElement.current = c;
                      }
                    }}
                  >
                    {getRowRenderer(event.ecs, rowRenderers).renderRow({
                      browserFields,
                      data: event.ecs,
                      children: (
                        <StatefulEventChild
                          actionsColumnWidth={actionsColumnWidth}
                          addNoteToEvent={addNoteToEvent}
                          associateNote={associateNote}
                          columnHeaders={columnHeaders}
                          columnRenderers={columnRenderers}
                          data={event.data}
                          eventIdToNoteIds={eventIdToNoteIds}
                          expanded={!!expanded[event._id]}
                          getNotesByIds={getNotesByIds}
                          id={event._id}
                          isEventPinned={isEventPinned}
                          isEventViewer={isEventViewer}
                          loading={loading}
                          onColumnResized={onColumnResized}
                          onPinEvent={onPinEvent}
                          onToggleExpanded={onToggleExpanded}
                          onToggleShowNotes={onToggleShowNotes}
                          onUnPinEvent={onUnPinEvent}
                          showNotes={!!showNotes[event._id]}
                          timelineId={timelineId}
                          updateNote={updateNote}
                        />
                      ),
                      timelineId,
                    })}

                    <Attributes>
                      <ExpandableEvent
                        browserFields={browserFields}
                        columnHeaders={columnHeaders}
                        event={detailsData || emptyDetails}
                        forceExpand={!!expanded[event._id] && !loading}
                        id={event._id}
                        onUpdateColumns={onUpdateColumns}
                        timelineId={timelineId}
                        toggleColumn={toggleColumn}
                      />
                    </Attributes>
                  </EventsTrGroup>
                )}
              </TimelineDetailsComponentQuery>
            );
          } else {
            // Height place holder for visibility detection as well as re-rendering sections.
            const height =
              divElement.current != null
                ? `${divElement.current.clientHeight}px`
                : DEFAULT_ROW_HEIGHT;

            // height is being inlined directly in here because of performance with StyledComponents
            // involving quick and constant changes to the DOM.
            // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
            return <SkeletonRow cellCount={columnCount} style={{ height }} />;
          }
        }}
      </VisibilitySensor>
    );
  }
);

StatefulEvent.displayName = 'StatefulEvent';
