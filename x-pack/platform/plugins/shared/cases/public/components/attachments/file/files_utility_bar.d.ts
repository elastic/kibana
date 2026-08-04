import React from 'react';
import type { AttachedFile } from './utils';
interface FilesUtilityBarProps {
    caseId: string;
    existingFiles?: AttachedFile[];
}
export declare const FilesUtilityBar: {
    ({ caseId, existingFiles }: FilesUtilityBarProps): React.JSX.Element;
    displayName: string;
};
export {};
