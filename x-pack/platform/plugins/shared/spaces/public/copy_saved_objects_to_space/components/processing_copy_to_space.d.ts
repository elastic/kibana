import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { ProcessedImportResponse } from '../lib';
import type { CopyOptions, CopyToSpaceSavedObjectTarget, ImportRetry } from '../types';
interface Props {
    savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>;
    copyInProgress: boolean;
    conflictResolutionInProgress: boolean;
    copyResult: Record<string, ProcessedImportResponse>;
    retries: Record<string, ImportRetry[]>;
    onRetriesChange: (retries: Record<string, ImportRetry[]>) => void;
    spaces: SpacesDataEntry[];
    copyOptions: CopyOptions;
}
export declare const ProcessingCopyToSpace: (props: Props) => React.JSX.Element;
export {};
