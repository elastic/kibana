import React from 'react';
import type { CaseUI } from '../../../../../common/ui/types';
export interface AttachSavedObjectModalProps {
    caseData: CaseUI;
    onClose: () => void;
}
export declare const AttachSavedObjectModal: React.FC<AttachSavedObjectModalProps>;
