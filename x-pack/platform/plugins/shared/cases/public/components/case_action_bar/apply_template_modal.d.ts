import type { FC } from 'react';
import type { CaseUI } from '../../../common';
interface ApplyTemplateModalProps {
    caseData: CaseUI;
    onClose: () => void;
}
export declare const ApplyTemplateModal: FC<ApplyTemplateModalProps>;
export {};
