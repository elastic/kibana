import type { CaseUI, AttachmentUIV2 } from '../../../../common/ui/types';
/**
 * Stable identifier for an attachment author. Prefers `profileUid`, then
 * `username`, then `email`. Returns the empty string when none are set.
 */
export declare const getAttachmentAuthorKey: (user: AttachmentUIV2["createdBy"]) => string;
/**
 * Display label for an attachment author. Prefers `fullName`, then `username`,
 * then `email`, falling back to a localized "Unknown" placeholder.
 */
export declare const getAttachmentAuthorLabel: (user: AttachmentUIV2["createdBy"]) => string;
export declare const getAttachmentItemCount: (comment: AttachmentUIV2) => number;
export declare const filterCaseAttachmentsBySearchTerm: (caseData: CaseUI, searchTerm: string) => CaseUI;
