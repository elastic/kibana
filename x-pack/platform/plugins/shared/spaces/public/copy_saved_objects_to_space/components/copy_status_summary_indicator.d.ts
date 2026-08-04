import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
interface Props {
    space: SpacesDataEntry;
    summarizedCopyResult: SummarizedCopyToSpaceResult;
    conflictResolutionInProgress: boolean;
    retries: ImportRetry[];
    onRetriesChange: (retries: ImportRetry[]) => void;
    onDestinationMapChange: (value?: Map<string, string>) => void;
}
export declare const CopyStatusSummaryIndicator: (props: Props) => React.JSX.Element;
export {};
