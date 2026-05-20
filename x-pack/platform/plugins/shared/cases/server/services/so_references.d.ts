import type { SavedObjectsUpdateResponse, SavedObject, SavedObjectReference } from '@kbn/core/server';
import type { AttachmentAttributesV2, AttachmentPatchAttributesV2 } from '../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { AttachmentPersistedAttributes, AttachmentRequestAttributes, AttachmentTransformedAttributes, AttachmentSavedObjectTransformed } from '../common/types/attachments_v1';
import { SOReferenceExtractor } from './so_reference_extractor';
import type { OptionalAttributes } from './types';
/**
 * Write-side / legacy read-side extractor: emits ONLY the legacy
 * `externalReferenceId` field. The unified flow mirrors `attachmentId`
 * separately via {@link buildUnifiedAttachmentSORefs} and keeps the
 * attribute in place. For the unified-aware read-side use
 * {@link getAttachmentInjectSOExtractor}.
 */
export declare const getAttachmentSOExtractor: (attachment: Partial<AttachmentRequestAttributes>) => SOReferenceExtractor;
/**
 * Unified-aware read-side extractor. Restores the legacy
 * `externalReferenceId` field and, for unified SO-backed payloads
 * (those carrying `metadata.soType`), also restores `attachmentId` from
 * references. Self-heals rows persisted before unified writes kept the
 * attribute in place; for new rows the inject is a no-op.
 */
export declare const getAttachmentInjectSOExtractor: (attachment: Partial<AttachmentRequestAttributes>) => SOReferenceExtractor;
/**
 * Mirrors `attachmentId` into `references` for SO-backed unified attachments
 * (those carrying `metadata.soType`) so SO export/import and `hasReference`
 * queries see the dependency. The attribute is intentionally kept in place so
 * read paths can consume it directly. Returns `[]` for non-SO-backed payloads
 * or when `attachmentId` is missing / not a single id string.
 */
export declare const buildUnifiedAttachmentSORefs: (attachment: Partial<AttachmentRequestAttributes> | Record<string, unknown>) => SavedObjectReference[];
/**
 * Read-side inject for `bulkGet` results where `attributes` may be undefined
 * when the SO was not found. Restores `externalReferenceId` (legacy) and, for
 * unified SO-backed payloads, `attachmentId`; rehydrates persistable-state refs.
 */
export declare const injectAttachmentAttributesAndHandleErrors: (savedObject: OptionalAttributes<AttachmentPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry) => OptionalAttributes<AttachmentTransformedAttributes>;
/**
 * Read-side inject. Restores `externalReferenceId` (legacy) and `attachmentId`
 * (unified SO-backed payloads with `metadata.soType`), then rehydrates
 * persistable-state references. Safe to use for both legacy and unified SOs.
 */
export declare const injectAttachmentSOAttributesFromRefs: (savedObject: SavedObject<AttachmentPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry) => AttachmentSavedObjectTransformed;
/** Patch-flow variant of {@link injectAttachmentSOAttributesFromRefs}. */
export declare const injectAttachmentSOAttributesFromRefsForPatch: (updatedAttributes: AttachmentPatchAttributesV2, savedObject: SavedObjectsUpdateResponse<AttachmentPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry) => SavedObjectsUpdateResponse<AttachmentTransformedAttributes>;
interface ExtractionResults {
    attributes: AttachmentPersistedAttributes;
    references: SavedObjectReference[];
    didDeleteOperation: boolean;
}
export declare const extractAttachmentSORefsFromAttributes: (attributes: AttachmentAttributesV2 | AttachmentPatchAttributesV2, references: SavedObjectReference[], persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry) => ExtractionResults;
export declare const getUniqueReferences: (references: SavedObjectReference[]) => SavedObjectReference[];
export {};
