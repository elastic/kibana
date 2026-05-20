import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
interface Props {
    summarizedCopyResult: SummarizedCopyToSpaceResult;
    space: SpacesDataEntry;
    retries: ImportRetry[];
    onRetriesChange: (retries: ImportRetry[]) => void;
    destinationMap: Map<string, string>;
    onDestinationMapChange: (value?: Map<string, string>) => void;
    conflictResolutionInProgress: boolean;
}
export declare const SpaceCopyResultDetails: (props: Props) => React.JSX.Element;
export {};
