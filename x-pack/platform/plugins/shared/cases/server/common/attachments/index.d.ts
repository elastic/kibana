import type { AttachmentPersistedAttributes, UnifiedAttachmentAttributes } from '../types/attachments_v2';
import { type AttachmentTypeTransformer } from './base';
export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export { getAttachmentSavedObjectType, resolveAttachmentSavedObjectType, } from './saved_object_type';
/**
 * Returns a routing key for transformer selection (not necessarily a normalized unified type).
 * For legacy `persistableState` attachments this is `persistableStateAttachmentTypeId` (e.g. `.lens`);
 * for legacy `externalReference` attachments with a migrated subtype this resolves to the unified
 * type name (e.g., externalReference + typeId 'endpoint' → 'security.endpoint');
 * for all other shapes it is the top-level `type` (e.g. `user`, `alert`, unified `lens`).
 * Use `toUnifiedAttachmentType` / `toUnifiedPersistableStateAttachmentType` from migration utils to normalize.
 * @throws Error if attributes is null or not an object
 */
export declare function getAttachmentTypeFromAttributes(attributes: unknown): string;
/**
 * Returns the persisted transformer for the routing key from {@link getAttachmentTypeFromAttributes}.
 * For comment/user types returns the comment transformer; for migrated persistable
 * types (e.g. Lens) returns the persistable-state transformer; for migrated external
 * reference subtypes (e.g. endpoint) returns the external reference transformer;
 * otherwise pass-through.
 */
export declare function getAttachmentTypeTransformers(type: string, owner: string): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes>;
