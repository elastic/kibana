import React from 'react';
import type { DataStreamResponse } from '../../../../../../common';
interface DataStreamsTableProps {
    integrationId: string;
    items: DataStreamResponse[];
    onReanalyzeSuccess?: () => void;
}
export declare const DataStreamsTable: {
    ({ integrationId, items, onReanalyzeSuccess, }: DataStreamsTableProps): React.JSX.Element;
    displayName: string;
};
export {};
