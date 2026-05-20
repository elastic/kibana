import React from 'react';
import type { LogEntry } from '../../../../common/search_strategies/log_entries/log_entry';
export interface LogEntryActionsMenuProps {
    logEntry: LogEntry;
}
export declare const LogEntryActionsMenu: ({ logEntry }: LogEntryActionsMenuProps) => React.JSX.Element;
export interface ContextRouterLinkProps {
    href: string | undefined;
    onClick: (event: React.MouseEvent) => void;
}
