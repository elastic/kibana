/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer, useContext, useMemo } from 'react';
import { connect } from 'react-redux';
import { StreamItem, LogEntryStreamItem } from '../../components/logging/log_text_stream/item';
import {
  logEntriesActions,
  logEntriesSelectors,
  logFilterSelectors,
  logPositionSelectors,
  State,
} from '../../store';
import { StoreContext } from '../../store/v2';
import { LogEntry, LogEntryHighlight } from '../../utils/log_entry';
import { PropsOfContainer, RendererFunction } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
// deep inporting to avoid a circular import problem
import { LogHighlightsState } from './log_highlights/log_highlights';
import { UniqueTimeKey } from '../../../common/time';
import { logEntriesQuery } from '../../graphql/log_entries.gql_query';

const withReduxState = connect((state: State) => ({
  // Get these from WithLogPosition hook
  isAutoReloading: logPositionSelectors.selectIsAutoReloading(state),
  wasAutoReloadJustAborted: logPositionSelectors.selectAutoReloadJustAborted(state),
}));

const LOAD_CHUNK_SIZE = 200;
export const WithStreamItems = withReduxState(({ children, ...props }) => {
  const { logEntries } = useContext(StoreContext);
  const { currentHighlightKey, logEntryHighlightsById } = useContext(LogHighlightsState.Context);

  const items = useMemo(
    () =>
      logEntries.isReloading && !props.isAutoReloading && !props.wasAutoReloadJustAborted
        ? []
        : logEntries.entries.map(logEntry =>
            createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.gid] || [])
          ),

    [logEntries.entries, logEntryHighlightsById]
  );

  return children({
    ...props,
    hasMoreBeforeStart: logEntries.hasMoreBefore,
    hasMoreAfterEnd: logEntries.hasMoreAfter,
    isReloading: logEntries.isReloading,
    isLoadingMore: logEntries.isLoadingMore,
    items,
    currentHighlightKey,
  });
});

export const withStreamItems = connect(
  (state: State) => ({
    isAutoReloading: logPositionSelectors.selectIsAutoReloading(state),
    isReloading: logEntriesSelectors.selectIsReloadingEntries(state),
    isLoadingMore: logEntriesSelectors.selectIsLoadingMoreEntries(state),
    wasAutoReloadJustAborted: logPositionSelectors.selectAutoReloadJustAborted(state),
    hasMoreBeforeStart: logEntriesSelectors.selectHasMoreBeforeStart(state),
    hasMoreAfterEnd: logEntriesSelectors.selectHasMoreAfterEnd(state),
    lastLoadedTime: logEntriesSelectors.selectEntriesLastLoadedTime(state),
    entries: logEntriesSelectors.selectEntries(state),
    entriesStart: logEntriesSelectors.selectEntriesStart(state),
    entriesEnd: logEntriesSelectors.selectEntriesEnd(state),
  }),
  bindPlainActionCreators({
    loadNewerEntries: logEntriesActions.loadNewerEntries,
    reloadEntries: logEntriesActions.reloadEntries,
    setSourceId: logEntriesActions.setSourceId,
  })
);

const createLogEntryStreamItem = (
  logEntry: LogEntry,
  highlights: LogEntryHighlight[]
): LogEntryStreamItem => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  highlights,
});
