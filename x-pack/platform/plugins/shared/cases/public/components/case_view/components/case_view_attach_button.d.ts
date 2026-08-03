import React from 'react';
import type { CaseUI } from '../../../../common/ui/types';
import type { AttachLocation } from '../../../analytics/use_attach_button_ebt';
export interface CaseViewAttachButtonProps {
    caseData: CaseUI;
    attachLocation: AttachLocation;
    fill?: boolean;
}
export declare const CaseViewAttachButton: React.NamedExoticComponent<CaseViewAttachButtonProps>;
