import type { ExternalReferenceAttachmentPayload } from '../../../common/types/domain';
type ExternalReferenceStorage = ExternalReferenceAttachmentPayload['externalReferenceStorage'];
/**
 * Returns the `externalReferenceStorage` to write for a legacy type id.
 * Defaults to `elasticSearchDoc` for types that have not declared a mapping.
 */
export declare function getExternalReferenceStorage(externalReferenceAttachmentTypeId: string): ExternalReferenceStorage;
/**
 * Returns true when the legacy type id is known to persist via `savedObject`
 * storage. Callers converting legacy → unified can use this to extract the
 * `soType` into `metadata` so nothing is lost in the round-trip.
 */
export declare function isSavedObjectBackedExternalReference(externalReferenceAttachmentTypeId: string): boolean;
export {};
