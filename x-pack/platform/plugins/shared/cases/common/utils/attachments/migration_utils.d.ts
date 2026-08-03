import type { AttachmentRequestV2 } from '../../types/api';
export declare const isMigratedAttachmentType: (type: string, owner: string) => boolean;
/**
 * True only for migrated attachment types that have no legacy (v1) equivalent.
 *
 * The incoming `type` may be legacy (`alert`/`event`) or unified, so we first
 * normalize via `toUnifiedAttachmentType(type, owner)`. A type is treated
 * as unified-only when it:
 *  1) is in `MIGRATED_ATTACHMENT_TYPES`,
 *  2) has no entry in `UNIFIED_TO_LEGACY_MAP`, and
 *  3) is not a persistable-state subtype (handled separately).
 */
export declare const isUnifiedOnlyAttachmentType: (type: string, owner: string) => boolean;
export declare const toLegacyAttachmentType: (type?: string) => string | undefined;
export declare const toUnifiedAttachmentType: (type: string, owner: string) => string;
/**
 * Returns true when the owner has a registered prefix in `OWNER_TO_PREFIX_MAP`,
 * meaning legacy `alert` / `event` types can be mapped to a valid unified
 * `<prefix>.<type>` (e.g. `security.alert`).
 */
export declare const hasOwnerUnifiedPrefix: (owner: string) => boolean;
/**
 * True when the persistable-state subtype id (legacy `.lens` or unified `lens`) is one
 * that this stack migrates to unified attachment attributes (currently Lens only).
 */
export declare const isPersistableType: (type: string) => boolean;
export declare const toUnifiedPersistableStateAttachmentType: (type: string) => string;
export declare const toLegacyPersistableStateAttachmentType: (type: string) => string;
/**
 * Returns a routing key derived from raw attachment attributes — useful when working
 * with persisted SO data of unknown shape.
 *
 * Not a fully-normalized unified type — for that compose with
 * {@link toUnifiedAttachmentType} / {@link toUnifiedPersistableStateAttachmentType}
 * (or use {@link resolveUnifiedAttachmentType}).
 *
 * @throws Error if attributes is null or not an object, or if `type` is missing.
 */
export declare const getAttachmentTypeFromAttributes: (attributes: unknown) => string;
/**
 * Resolves a typed V2 attachment to its fully-normalized unified type
 * (`security.alert`, `lens`, `file`, …).
 */
export declare const resolveUnifiedAttachmentType: (attachment: AttachmentRequestV2, owner: string) => string;
/**
 * Extracts the reference id from a reference-based attachment for delete label
 * Other reference attachment ids are not extracted because they are singular
 * and delete label is static.
 */
export declare const getReferenceAttachmentId: (attachment: AttachmentRequestV2) => string | string[] | undefined;
