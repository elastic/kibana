import type { CaseUI } from '../../../../common';
/**
 * Attachment-tab filter selections persisted to local storage so they survive
 * reloads. Kept separate from the activity-tab filters (different key + shape).
 * The free-text search term is intentionally excluded.
 */
export interface AttachmentTabFilters {
    selectedAttachmentTypes: string[];
    selectedAuthors: string[];
}
export interface CaseViewFiltersParams {
    selectedAttachmentTypes: string[];
    setSelectedAttachmentTypes: (next: string[]) => void;
    selectedAuthors: string[];
    setSelectedAuthors: (next: string[]) => void;
}
export interface CaseViewFiltersResult extends CaseViewFiltersParams {
    filteredCaseData: CaseUI;
    isTypeVisible: (typeId: string) => boolean;
    isTypeFilterActive: boolean;
    isAuthorFilterActive: boolean;
    hasActiveFilter: boolean;
    clearFilters: () => void;
}
/**
 * Owns the attachment-type and author filter state for a case view, plus the
 * derived `filteredCaseData` consumers usually want to feed into their
 * per-accordion / per-list views.
 */
export declare const useCaseViewFilters: (caseData: CaseUI) => CaseViewFiltersResult;
