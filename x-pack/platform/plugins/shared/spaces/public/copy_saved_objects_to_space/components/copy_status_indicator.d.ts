import React from 'react';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
interface Props {
    summarizedCopyResult: SummarizedCopyToSpaceResult;
    object: {
        type: string;
        id: string;
    };
    pendingObjectRetry?: ImportRetry;
    conflictResolutionInProgress: boolean;
}
export declare const CopyStatusIndicator: (props: Props) => React.JSX.Element | null;
export {};
