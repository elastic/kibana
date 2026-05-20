import React from 'react';
import type { CaseUI } from '../../../common/ui/types';
interface CaseViewActions {
    caseData: CaseUI;
    currentExternalIncident: CaseUI['externalService'];
}
export declare const Actions: React.NamedExoticComponent<CaseViewActions>;
export {};
