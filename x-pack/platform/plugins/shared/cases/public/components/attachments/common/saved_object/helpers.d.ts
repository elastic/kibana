import type { ApplicationStart } from '@kbn/core/public';
import type { AttachmentUIV2 } from '../../../../../common/ui/types';
import type { FoundSavedObject, SavedObjectAttachmentAttributes, SavedObjectAttachmentUI } from './types';
/**
 * Maps each attachment-type id that represents a saved-object attachment to
 * its SO type name as understood by the `_find` API and in-app URLs. Single
 * source of truth for "is this attachment a saved-object reference, and which
 * SO type does it point at?".
 */
export declare const ATTACHMENT_TYPE_TO_SO_TYPE: {
    readonly dashboard: "dashboard";
    readonly discoverSession: "search";
    readonly lens: "lens";
    readonly map: "map";
};
export type SavedObjectAttachmentType = keyof typeof ATTACHMENT_TYPE_TO_SO_TYPE;
export type SupportedSavedObjectType = (typeof ATTACHMENT_TYPE_TO_SO_TYPE)[SavedObjectAttachmentType];
/** Attachment-type ids that correspond to saved-object attachments. */
export declare const SAVED_OBJECT_ATTACHMENT_TYPES: Set<string>;
/** SO types the attach modal can search for, derived from the same source. */
export declare const SUPPORTED_SO_TYPES: SupportedSavedObjectType[];
/** Inverse of `ATTACHMENT_TYPE_TO_SO_TYPE`, used by the attach action. */
export declare const SO_TYPE_TO_ATTACHMENT_TYPE: Record<SupportedSavedObjectType, SavedObjectAttachmentType>;
export declare const isSavedObjectAttachment: (attachment: AttachmentUIV2) => attachment is SavedObjectAttachmentUI;
/**
 * Extracts the SO-attachment attributes (foreign SO id, soType, cached title)
 * from any SO-backed unified attachment.
 */
export declare const getSavedObjectAttachmentAttributes: (attachment: SavedObjectAttachmentUI) => SavedObjectAttachmentAttributes;
export declare const getSavedObjectKey: (soType: SupportedSavedObjectType, id: string) => string;
export declare const fitsSnapshotBudget: (snapshot: unknown) => boolean;
/**
 * Walks `caseData.comments` once to collect the foreign SO keys of every
 * SO-typed attachment on the case.
 */
export declare const getAttachedSavedObjectKeys: (attachments: AttachmentUIV2[]) => Set<string>;
/**
 * Walks the dotted `uiCapabilitiesPath` on `application.capabilities` to decide
 * whether the current user can open the SO in its source app. Returns true
 * when the SO has no `inAppUrl` capability requirement at all.
 */
export declare const canAccessSavedObject: (object: FoundSavedObject, capabilities: ApplicationStart["capabilities"]) => boolean;
