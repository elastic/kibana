/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { uniq } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { DefaultDraggable } from '../../draggables';
import { EVENT_DURATION_FIELD_NAME } from '../../duration';
import { FormattedDate } from '../../formatted_date';
import { FormattedDuration } from '../../formatted_duration';

export const EVENT_START_FIELD_NAME = 'event.start';
export const EVENT_END_FIELD_NAME = 'event.end';

const TimeIcon = styled(EuiIcon)`
  margin-right: 3px;
  position: relative;
  top: -1px;
`;

TimeIcon.displayName = 'TimeIcon';

/**
 * Renders a column of draggable badges containing:
 * - `event.duration`
 * - `event.start`
 * - `event.end`
 */
export const DurationEventStartEnd = React.memo<{
  contextId: string;
  eventDuration?: string[] | null;
  eventId: string;
  eventEnd?: string[] | null;
  eventStart?: string[] | null;
}>(({ contextId, eventDuration, eventId, eventEnd, eventStart }) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="duration-and-start-group"
    direction="column"
    justifyContent="center"
    gutterSize="none"
  >
    {eventDuration != null
      ? uniq(eventDuration).map(duration => (
          <EuiFlexItem grow={false} key={duration}>
            <DefaultDraggable
              data-test-subj="event-duration"
              field={EVENT_DURATION_FIELD_NAME}
              id={`duration-event-start-end-default-draggable-${contextId}-${eventId}-${EVENT_DURATION_FIELD_NAME}-${duration}`}
              name={name}
              tooltipContent={null}
              value={duration}
            >
              <EuiText size="xs">
                <TimeIcon size="m" type="clock" />
                <FormattedDuration
                  maybeDurationNanoseconds={duration}
                  tooltipTitle={EVENT_DURATION_FIELD_NAME}
                />
              </EuiText>
            </DefaultDraggable>
          </EuiFlexItem>
        ))
      : null}
    {eventStart != null
      ? uniq(eventStart).map(start => (
          <EuiFlexItem grow={false} key={start}>
            <DefaultDraggable
              data-test-subj="event-start"
              field={EVENT_START_FIELD_NAME}
              id={`duration-event-start-end-default-draggable-${contextId}-${eventId}-${EVENT_START_FIELD_NAME}-${start}`}
              tooltipContent={null}
              value={start}
            >
              <EuiText size="xs">
                <TimeIcon size="m" type="clock" />
                <FormattedDate fieldName={EVENT_START_FIELD_NAME} value={start} />
              </EuiText>
            </DefaultDraggable>
          </EuiFlexItem>
        ))
      : null}
    {eventEnd != null
      ? uniq(eventEnd).map(end => (
          <EuiFlexItem grow={false} key={end}>
            <DefaultDraggable
              data-test-subj="event-end"
              field={EVENT_END_FIELD_NAME}
              id={`duration-event-start-end-default-draggable-${contextId}-${eventId}-${EVENT_END_FIELD_NAME}-${end}`}
              tooltipContent={null}
              value={end}
            >
              <EuiText size="xs">
                <TimeIcon size="m" type="clock" />
                <FormattedDate fieldName={EVENT_END_FIELD_NAME} value={end} />
              </EuiText>
            </DefaultDraggable>
          </EuiFlexItem>
        ))
      : null}
  </EuiFlexGroup>
));

DurationEventStartEnd.displayName = 'DurationEventStartEnd';
