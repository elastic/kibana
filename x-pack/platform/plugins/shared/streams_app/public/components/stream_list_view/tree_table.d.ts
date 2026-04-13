import React from 'react';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
export declare function StreamsTreeTable({ loading, streams, canReadFailureStore, wiredStreamsStatus, openFlyout, }: {
    streams?: ListStreamDetail[];
    canReadFailureStore?: boolean;
    loading?: boolean;
    wiredStreamsStatus?: WiredStreamsStatus;
    openFlyout?: () => void;
}): React.JSX.Element;
