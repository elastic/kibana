import type { Query } from '@kbn/es-query';
import React from 'react';
import type { TimeKey } from '@kbn/io-ts-utils';
import type { LogEntry } from '../../../../common/search_strategies/log_entries/log_entry';
export declare const LogEntryFieldsTable: React.FC<{
    logEntry: LogEntry;
    onSetFieldFilter?: (filter: Query, logEntryId: string, timeKey?: TimeKey) => void;
}>;
