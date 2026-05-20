import type { Query } from '@kbn/es-query';
import React from 'react';
import type { TimeKey } from '@kbn/io-ts-utils';
import type { LogViewReference } from '../../../../common/log_views';
export interface LogEntryFlyoutProps {
    logEntryId: string | null | undefined;
    onCloseFlyout: () => void;
    onSetFieldFilter?: (filter: Query, logEntryId: string, timeKey?: TimeKey) => void;
    logViewReference: LogViewReference | null | undefined;
}
export declare const useLogEntryFlyout: (logViewReference: LogViewReference) => {
    openLogEntryFlyout: (logEntryId: string | null | undefined) => void;
    closeLogEntryFlyout: () => void;
};
export declare const LogEntryFlyout: ({ logEntryId, onCloseFlyout, onSetFieldFilter, logViewReference, }: LogEntryFlyoutProps) => React.JSX.Element;
export default LogEntryFlyout;
