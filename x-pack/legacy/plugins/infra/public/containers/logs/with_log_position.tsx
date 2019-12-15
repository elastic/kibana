/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { pickTimeKey } from '../../../common/time';
import { logPositionActions, logPositionSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../utils/url_state';

export const withLogPosition = connect(
  (state: State) => ({
    firstVisiblePosition: logPositionSelectors.selectFirstVisiblePosition(state),
    isAutoReloading: logPositionSelectors.selectIsAutoReloading(state),
    isScrollLocked: logPositionSelectors.selectAutoReloadScrollLock(state),
    lastVisiblePosition: logPositionSelectors.selectFirstVisiblePosition(state),
    targetPosition: logPositionSelectors.selectTargetPosition(state),
    urlState: selectPositionUrlState(state),
    visibleTimeInterval: logPositionSelectors.selectVisibleTimeInterval(state),
    visibleMidpoint: logPositionSelectors.selectVisibleMidpointOrTarget(state),
    visibleMidpointTime: logPositionSelectors.selectVisibleMidpointOrTargetTime(state),
  }),
  bindPlainActionCreators({
    jumpToTargetPosition: logPositionActions.jumpToTargetPosition,
    jumpToTargetPositionTime: logPositionActions.jumpToTargetPositionTime,
    reportVisiblePositions: logPositionActions.reportVisiblePositions,
    startLiveStreaming: logPositionActions.startAutoReload,
    stopLiveStreaming: logPositionActions.stopAutoReload,
    scrollLockLiveStreaming: logPositionActions.lockAutoReloadScroll,
    scrollUnlockLiveStreaming: logPositionActions.unlockAutoReloadScroll,
  })
);

export const WithLogPosition = asChildFunctionRenderer(withLogPosition, {
  onCleanup: ({ stopLiveStreaming }) => stopLiveStreaming(),
});

/**
 * Url State
 */

interface LogPositionUrlState {
  position?: ReturnType<typeof logPositionSelectors.selectVisibleMidpointOrTarget>;
  streamLive?: ReturnType<typeof logPositionSelectors.selectIsAutoReloading>;
}

export const WithLogPositionUrlState = () => (
  <WithLogPosition>
    {({
      jumpToTargetPosition,
      jumpToTargetPositionTime,
      startLiveStreaming,
      stopLiveStreaming,
      urlState,
    }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="logPosition"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
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
        onInitialize={initialUrlState => {
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
    )}
  </WithLogPosition>
);

const selectPositionUrlState = createSelector(
  logPositionSelectors.selectVisibleMidpointOrTarget,
  logPositionSelectors.selectIsAutoReloading,
  (position, streamLive) => ({
    position: position ? pickTimeKey(position) : null,
    streamLive,
  })
);

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
