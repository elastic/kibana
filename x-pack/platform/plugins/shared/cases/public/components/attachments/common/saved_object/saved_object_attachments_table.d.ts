import React from 'react';
import type { CaseUI } from '../../../../../common/ui/types';
export interface SavedObjectAttachmentsTableProps {
    caseData: CaseUI;
    searchTerm?: string;
    /** Attachment registration id (e.g. `dashboard`, `map`, `discoverSession`). */
    attachmentTypeId: string;
    /** SO type used for in-app URL resolution (e.g. `dashboard`, `map`, `search`). */
    soType: string;
}
/**
 * Renders a small table of saved-object attachments for a given attachment
 * type. Rows are derived from `caseData.comments` (no extra fetch); in-app
 * URLs are resolved through `useSavedObjectInAppUrls` so each title links to
 * the underlying app (or falls back to a disabled link when the SO is gone).
 *
 * Uses `EuiInMemoryTable` so pagination + page-clamping (when `searchTerm`
 * shrinks the set past the current page) are handled by EUI, not by us.
 */
export declare const SavedObjectAttachmentsTable: React.FC<SavedObjectAttachmentsTableProps>;
