export type AttachLocation = 'activity' | 'attachments';
export type AttachMenuItemType = 'file' | 'timeline' | 'saved_object';
/**
 * Events Based Tracking for clicking the Case View attach button
 */
export declare const useAttachButtonClickedEBT: () => (attachLocation: AttachLocation) => void;
/**
 * Events Based Tracking for selecting an option in the Case View attach menu
 */
export declare const useAttachMenuItemClickedEBT: () => (attachmentType: AttachMenuItemType) => void;
