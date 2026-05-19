import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
interface Props {
    space: SpacesDataEntry;
    summarizedCopyResult: SummarizedCopyToSpaceResult;
    retries: ImportRetry[];
    onRetriesChange: (retries: ImportRetry[]) => void;
    conflictResolutionInProgress: boolean;
}
export declare const SpaceResultProcessing: (props: Pick<Props, "space">) => React.JSX.Element;
export declare const SpaceResult: (props: Props) => React.JSX.Element;
export {};
