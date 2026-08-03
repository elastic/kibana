import React from 'react';
import type { CaseUI } from '../../../../common';
export declare const ATTACHMENT_TYPE_FILTER_ID = "attachmentType";
interface AttachmentTypeFilterProps {
    caseData: CaseUI;
    isLoading?: boolean;
    selectedAttachmentTypes: string[];
    onAttachmentTypesChange: (selectedAttachmentTypes: string[]) => void;
    /**
     * Type ids to omit from the dropdown (e.g. types without a tab view in the
     * attachments tab).
     */
    excludedTypes?: readonly string[];
}
export declare const AttachmentTypeFilter: React.NamedExoticComponent<AttachmentTypeFilterProps>;
export {};
