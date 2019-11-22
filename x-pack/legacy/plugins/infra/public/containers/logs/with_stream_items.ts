/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useMemo } from 'react';
import { StreamItem, LogEntryStreamItem } from '../../components/logging/log_text_stream/item';
import { useStore, LogEntriesState } from '../../store/v2';
import { LogEntry, LogEntryHighlight } from '../../utils/log_entry';
import { RendererFunction } from '../../utils/typed_react';
// deep inporting to avoid a circular import problem
import { LogHighlightsState } from './log_highlights/log_highlights';
import { UniqueTimeKey } from '../../../common/time';

export const WithStreamItems: React.FunctionComponent<{
  children: RendererFunction<
    LogEntriesState & {
      currentHighlightKey: UniqueTimeKey | null;
      items: StreamItem[];
    }
  >;
}> = ({ children }) => {
  const { logEntries, logPosition } = useStore();
  const { currentHighlightKey, logEntryHighlightsById } = useContext(LogHighlightsState.Context);

  const items = useMemo(
    () =>
      logEntries.isReloading && !logPosition.isAutoReloading
        ? []
        : logEntries.entries.map(logEntry =>
            createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.gid] || [])
          ),

    [logEntries.entries, logEntryHighlightsById]
  );

  return children({
    ...logEntries,
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
