import type { EuiTableSelectionType, Query } from '@elastic/eui';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import React from 'react';
import type { TableRow } from './utils';
export declare function StreamsTreeTable({ loading, streams, streamOnboardingResultMap, searchQuery, selection, onOnboardStreamActionClick, onStopOnboardingActionClick, }: {
    streams?: ListStreamDetail[];
    streamOnboardingResultMap: Record<string, TaskResult<OnboardingResult>>;
    loading?: boolean;
    searchQuery?: Query;
    selection: EuiTableSelectionType<TableRow>;
    onOnboardStreamActionClick: (streamName: string) => void;
    onStopOnboardingActionClick: (streamName: string) => void;
}): React.JSX.Element;
