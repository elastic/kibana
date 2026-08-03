import type { FC } from 'react';
import type { CaseUI } from '../../../../../../common';
export interface TemplateSettingsPopoverProps {
    caseData: CaseUI;
    'data-test-subj'?: string;
}
export declare const TemplateSettingsPopover: FC<TemplateSettingsPopoverProps>;
