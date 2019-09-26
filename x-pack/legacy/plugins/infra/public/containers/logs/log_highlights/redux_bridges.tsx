/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useContext } from 'react';

import { TimeKey } from '../../../../common/time';
import { withLogFilter } from '../with_log_filter';
import { withStreamItems } from '../with_stream_items';
import { withLogPosition } from '../with_log_position';
import { LogHighlightsState } from './log_highlights';

// Bridges Redux container state with Hooks state. Once state is moved fully from
// Redux to Hooks this can be removed.
export const LogHighlightsStreamItemsBridge = withStreamItems(
  ({ entriesStart, entriesEnd }: { entriesStart: TimeKey | null; entriesEnd: TimeKey | null }) => {
    const { setStartKey, setEndKey } = useContext(LogHighlightsState.Context);
    useEffect(() => {
      setStartKey(entriesStart);
      setEndKey(entriesEnd);
    }, [entriesStart, entriesEnd]);

    return null;
  }
);

export const LogHighlightsPositionBridge = withLogPosition(
  ({
    visibleMidpoint,
    jumpToTargetPosition,
  }: {
    visibleMidpoint: TimeKey | null;
    jumpToTargetPosition: (target: TimeKey) => void;
  }) => {
    const { setJumpToTarget, setVisibleMidpoint } = useContext(LogHighlightsState.Context);
    useEffect(() => {
      setVisibleMidpoint(visibleMidpoint);
    }, [visibleMidpoint]);

    useEffect(() => {
      setJumpToTarget(() => jumpToTargetPosition);
    }, [jumpToTargetPosition]);

    return null;
  }
);

export const LogHighlightsFilterQueryBridge = withLogFilter(
  ({ serializedFilterQuery }: { serializedFilterQuery: string | null }) => {
    const { setFilterQuery } = useContext(LogHighlightsState.Context);

    useEffect(() => {
      setFilterQuery(serializedFilterQuery);
    }, [serializedFilterQuery]);

    return null;
  }
);

export const LogHighlightsBridge = ({ indexPattern }: { indexPattern: any }) => (
  <>
    <LogHighlightsStreamItemsBridge />
    <LogHighlightsPositionBridge />
    <LogHighlightsFilterQueryBridge indexPattern={indexPattern} />
  </>
);
