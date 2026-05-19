import type { SavedObjectsType } from '@kbn/core/server';
/**
 * Saved object type for unified attachments
 * This is the v2 version of the comments saved object type (CASE_COMMENT_SAVED_OBJECT).
 *
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */
export declare const createCaseAttachmentSavedObjectType: () => SavedObjectsType;
