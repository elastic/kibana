import React from 'react';
import type { CommonAttachmentTabViewProps } from '../../../client/attachment_framework/types';
export declare const DEFAULT_CASE_FILES_FILTERING_OPTIONS: {
    page: number;
    perPage: number;
};
export declare const CaseViewFiles: {
    ({ caseData, searchTerm }: CommonAttachmentTabViewProps): React.JSX.Element;
    displayName: string;
};
