/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useContext, useMemo } from 'react';
import { connect } from 'react-redux';

import { StreamItem, LogEntryStreamItem } from '../../components/logging/log_text_stream/item';
import { logEntriesActions, logEntriesSelectors, logPositionSelectors, State } from '../../store';
import { LogEntry, LogEntryHighlight } from '../../utils/log_entry';
import { PropsOfContainer, RendererFunction } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
// deep inporting to avoid a circular import problem
import { LogHighlightsState } from './log_highlights/log_highlights';
import { UniqueTimeKey } from '../../../common/time';

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

type WithStreamItemsProps = PropsOfContainer<typeof withStreamItems>;

export const WithStreamItems = withStreamItems(
  ({
    children,
    initializeOnMount,
    ...props
  }: WithStreamItemsProps & {
    children: RendererFunction<
      WithStreamItemsProps & {
        currentHighlightKey: UniqueTimeKey | null;
        items: StreamItem[];
      }
    >;
    initializeOnMount: boolean;
  }) => {
    const { currentHighlightKey, logEntryHighlightsById } = useContext(LogHighlightsState.Context);
    const items = useMemo(
      () =>
        props.isReloading && !props.isAutoReloading && !props.wasAutoReloadJustAborted
          ? []
          : props.entries.map(logEntry =>
              createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.gid] || [])
            ),

      [
        props.isReloading,
        props.isAutoReloading,
        props.wasAutoReloadJustAborted,
        props.entries,
        logEntryHighlightsById,
      ]
    );

    useEffect(() => {
      if (initializeOnMount && !props.isReloading && !props.isLoadingMore) {
        props.reloadEntries();
      }
    }, []);

    return children({
      ...props,
      currentHighlightKey,
      items,
    });
  }
);

const createLogEntryStreamItem = (
  logEntry: LogEntry,
  highlights: LogEntryHighlight[]
): LogEntryStreamItem => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  highlights,
});

/**
 * This component serves as connection between the state and side-effects
 * managed by redux and the state and effects managed by hooks. In particular,
 * it forwards changes of the source id to redux via the action creator
 * `setSourceId`.
 *
 * It will be mounted beneath the hierachy level where the redux store and the
 * source state are initialized. Once the log entry state and loading
 * side-effects have been migrated from redux to hooks it can be removed.
 */
export const ReduxSourceIdBridge = withStreamItems(
  ({ setSourceId, sourceId }: { setSourceId: (sourceId: string) => void; sourceId: string }) => {
    useEffect(() => {
      setSourceId(sourceId);
    }, [setSourceId, sourceId]);

    return null;
  }
);
