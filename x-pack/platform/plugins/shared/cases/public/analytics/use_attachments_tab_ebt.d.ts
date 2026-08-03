/**
 * Events Based Tracking for Case View attachments tab
 */
export declare const useAttachmentsTabClickedEBT: () => () => void;
/**
 * Events Based Tracking for Case View attachments sub tab
 */
export declare const useAttachmentsSubTabClickedEBT: () => (attachmentType: string) => void;
/**
 * Events Based Tracking for opening an attachment accordion in the redesigned Case View.
 * Distinct from `useAttachmentsSubTabClickedEBT`, which tracks the legacy horizontal tabs UI.
 */
export declare const useAttachmentAccordionOpenedEBT: () => (attachmentType: string) => void;
