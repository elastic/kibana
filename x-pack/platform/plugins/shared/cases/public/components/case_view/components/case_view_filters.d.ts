import React from 'react';
import type { CaseUI } from '../../../../common';
import type { CaseViewFiltersResult } from '../hooks/use_case_view_filters';
interface CaseViewFiltersProps {
    caseData: CaseUI;
    state: Pick<CaseViewFiltersResult, 'selectedAttachmentTypes' | 'setSelectedAttachmentTypes' | 'selectedAuthors' | 'setSelectedAuthors'>;
    isLoading?: boolean;
    /**
     * Unified attachment type ids to omit from the type filter (e.g. `'comment'`
     * in the attachments tab where comments are not displayed).
     */
    excludedTypes?: readonly string[];
}
/**
 * Renders the attachment-type and author filter triggers in a single flex item.
 * The shared "Clear filters" affordance lives in the parent layout (see
 * `CaseViewAttachments`) so it sits alongside the search bar, mirroring the
 * pattern used in the all-cases view.
 */
export declare const CaseViewFilters: React.NamedExoticComponent<CaseViewFiltersProps>;
export {};
