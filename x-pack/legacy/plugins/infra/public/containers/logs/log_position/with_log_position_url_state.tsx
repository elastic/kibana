/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';

import { pickTimeKey } from '../../../../common/time';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
import { LogPositionState, LogPositionStateParams } from './log_position_state';

/**
 * Url State
 */

interface LogPositionUrlState {
  position: LogPositionStateParams['visibleMidpoint'] | undefined;
  streamLive?: boolean | undefined;
}

export const WithLogPositionUrlState = () => {
  const {
    visibleMidpoint,
    isAutoReloading,
    jumpToTargetPosition,
    jumpToTargetPositionTime,
    startLiveStreaming,
    stopLiveStreaming,
  } = useContext(LogPositionState.Context);
  const urlState = useMemo(
    () => ({
      position: visibleMidpoint ? pickTimeKey(visibleMidpoint) : null,
      streamLive: isAutoReloading,
    }),
    [visibleMidpoint, isAutoReloading]
  );
  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="logPosition"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState: LogPositionUrlState | undefined) => {
        if (newUrlState && newUrlState.position) {
          jumpToTargetPosition(newUrlState.position);
        }
        if (newUrlState && newUrlState.streamLive) {
          startLiveStreaming();
        } else if (
          newUrlState &&
          typeof newUrlState.streamLive !== 'undefined' &&
          !newUrlState.streamLive
        ) {
          stopLiveStreaming();
        }
      }}
      onInitialize={(initialUrlState: LogPositionUrlState | undefined) => {
        if (initialUrlState && initialUrlState.position) {
          jumpToTargetPosition(initialUrlState.position);
        } else {
          jumpToTargetPositionTime(Date.now());
        }
        if (initialUrlState && initialUrlState.streamLive) {
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
      }
    : undefined;

const mapToPositionUrlState = (value: any) =>
  value && typeof value.time === 'number' && typeof value.tiebreaker === 'number'
    ? pickTimeKey(value)
    : undefined;

const mapToStreamLiveUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);

export const replaceLogPositionInQueryString = (time: number) =>
  Number.isNaN(time)
    ? (value: string) => value
    : replaceStateKeyInQueryString<LogPositionUrlState>('logPosition', {
        position: {
          time,
          tiebreaker: 0,
        },
      });
