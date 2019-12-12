/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useMemo } from 'react';
import { StreamItem, LogEntryStreamItem } from '../../components/logging/log_text_stream/item';
import { LogEntry, LogEntryHighlight } from '../../utils/log_entry';
import { RendererFunction } from '../../utils/typed_react';
// deep inporting to avoid a circular import problem
import { LogHighlightsState } from './log_highlights/log_highlights';
import { LogPositionState } from './log_position';
import { LogEntriesState, LogEntriesStateParams, LogEntriesCallbacks } from './log_entries';
import { UniqueTimeKey } from '../../../common/time';

export const WithStreamItems: React.FunctionComponent<{
  children: RendererFunction<
    LogEntriesStateParams &
      LogEntriesCallbacks & {
        currentHighlightKey: UniqueTimeKey | null;
        items: StreamItem[];
      }
  >;
}> = ({ children }) => {
  const [logEntries, logEntriesCallbacks] = useContext(LogEntriesState.Context);
  const { isAutoReloading } = useContext(LogPositionState.Context);
  const { currentHighlightKey, logEntryHighlightsById } = useContext(LogHighlightsState.Context);

  const items = useMemo(
    () =>
      logEntries.isReloading && !isAutoReloading
        ? []
        : logEntries.entries.map(logEntry =>
            createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.gid] || [])
          ),

    [logEntries.entries, logEntryHighlightsById]
  );

  return children({
    ...logEntries,
    ...logEntriesCallbacks,
    items,
    currentHighlightKey,
  });
};

const createLogEntryStreamItem = (
  logEntry: LogEntry,
  highlights: LogEntryHighlight[]
): LogEntryStreamItem => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  highlights,
});
