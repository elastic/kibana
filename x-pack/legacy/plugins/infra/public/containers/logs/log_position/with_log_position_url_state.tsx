/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';
import datemath from '@elastic/datemath';

import { pickTimeKey } from '../../../../common/time';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
import { LogPositionState, LogPositionStateParams } from './log_position_state';

/**
 * Url State
 */

interface LogPositionUrlState {
  position: LogPositionStateParams['visibleMidpoint'] | undefined;
  streamLive: boolean;
  start?: string;
  end?: string;
}

export const WithLogPositionUrlState = () => {
  const {
    visibleMidpoint,
    isAutoReloading,
    jumpToTargetPosition,
    jumpToTargetPositionTime,
    startLiveStreaming,
    stopLiveStreaming,
    startDate,
    endDate,
    updateDateRange,
  } = useContext(LogPositionState.Context);
  const urlState = useMemo(
    () => ({
      position: visibleMidpoint ? pickTimeKey(visibleMidpoint) : null,
      streamLive: isAutoReloading,
      start: startDate,
      end: endDate,
    }),
    [visibleMidpoint, isAutoReloading, startDate, endDate]
  );
  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="logPosition"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState: LogPositionUrlState | undefined) => {
        if (!newUrlState) {
          return;
        }

        if (newUrlState.start || newUrlState.end) {
          updateDateRange({ startDate: newUrlState.start, endDate: newUrlState.end });
        }

        if (newUrlState.position) {
          jumpToTargetPosition(newUrlState.position);
        }

        if (newUrlState.streamLive) {
          startLiveStreaming();
        } else if (typeof newUrlState.streamLive !== 'undefined' && !newUrlState.streamLive) {
          stopLiveStreaming();
        }
      }}
      onInitialize={(initialUrlState: LogPositionUrlState | undefined) => {
        if (!initialUrlState) {
          jumpToTargetPositionTime(Date.now());
          return;
        }

        if (initialUrlState.start || initialUrlState.end) {
          updateDateRange({ startDate: initialUrlState.start, endDate: initialUrlState.end });
        }

        if (initialUrlState.position) {
          jumpToTargetPosition(initialUrlState.position);
        } else {
          jumpToTargetPositionTime(Date.now());
        }

        if (initialUrlState.streamLive) {
          startLiveStreaming();
        }
      }}
    />
  );
};

const mapToUrlState = (value: any): LogPositionUrlState | undefined =>
  value
    ? {
        position: mapToPositionUrlState(value.position),
        streamLive: mapToStreamLiveUrlState(value.streamLive),
        start: mapToDate(value.start),
        end: mapToDate(value.end),
      }
    : undefined;

const mapToPositionUrlState = (value: any) =>
  value && typeof value.time === 'number' && typeof value.tiebreaker === 'number'
    ? pickTimeKey(value)
    : undefined;

const mapToStreamLiveUrlState = (value: any) => (typeof value === 'boolean' ? value : false);

const mapToDate = (value: any) => {
  const parsed = datemath.parse(value);
  if (!parsed || !parsed.isValid()) {
    return undefined;
  }
  return value;
};

export const replaceLogPositionInQueryString = (time: number) =>
  Number.isNaN(time)
    ? (value: string) => value
    : replaceStateKeyInQueryString<LogPositionUrlState>('logPosition', {
        position: {
          time,
          tiebreaker: 0,
        },
        streamLive: false,
      });
