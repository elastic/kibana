import React from 'react';
interface ViewLogsProps {
    logStreamQuery: string;
    startTime: number;
    endTime: number;
}
export declare const getFormattedRange: (date: string) => number;
export declare const ViewLogsButton: React.FunctionComponent<ViewLogsProps>;
export {};
