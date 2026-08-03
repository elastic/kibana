import React from 'react';
import type { ProcessedImportResponse } from '../lib';
import type { ImportRetry } from '../types';
interface Props {
    copyInProgress: boolean;
    conflictResolutionInProgress: boolean;
    initialCopyFinished: boolean;
    copyResult: Record<string, ProcessedImportResponse>;
    retries: Record<string, ImportRetry[]>;
    numberOfSelectedSpaces: number;
    onClose: () => void;
    onCopyStart: () => void;
    onCopyFinish: () => void;
}
export declare const CopyToSpaceFlyoutFooter: (props: Props) => React.JSX.Element;
export {};
