import React from 'react';
import type { AttachedFile } from './utils';
export interface UploadFileModalProps {
    caseId: string;
    onClose: () => void;
    /**
     * Files already attached to the case (name + extension). Used to warn before
     * re-uploading a duplicate. Sourced in-memory from the case comments, so no
     * extra fetch is needed.
     */
    existingFiles?: AttachedFile[];
}
export declare const UploadFileModal: React.NamedExoticComponent<UploadFileModalProps>;
