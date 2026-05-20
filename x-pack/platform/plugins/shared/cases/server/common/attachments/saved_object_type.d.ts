import type { SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type { ConfigType } from '../../config';
/**
 * Determines which saved object type should be used for a given attachment type
 * based on the feature flag and migration status.
 *
 * @param config - The cases plugin configuration
 * @param attachmentType - Optional attachment type. If not provided, returns the default SO type.
 * @returns The saved object type to use ('cases-attachments' or 'cases-comments')
 */
export declare function getAttachmentSavedObjectType(config: ConfigType): typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT;
/**
 * Resolves which saved object type contains the attachment by id.
 * Tries the new SO type first, then falls back to the old SO type.
 *
 * @param client - The saved objects client
 * @param savedObjectId - Saved object id of the cases attachment to resolve
 * @returns The saved object type where the attachment exists, or null if not found
 */
export declare function resolveAttachmentSavedObjectType(client: SavedObjectsClientContract, savedObjectId: string): Promise<typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT | null>;
