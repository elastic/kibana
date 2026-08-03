import type { CaseAttachmentWithoutOwner } from '../types';
/**
 * Events Based Tracking for Case Event attachments being created
 */
export declare const useAttachEventsEBT: () => (attachmentSource: string, attachments: CaseAttachmentWithoutOwner[]) => void;
