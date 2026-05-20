import type { SavedObject } from '@kbn/core/types';
import type { Tag, TagAttributes } from '@kbn/saved-objects-tagging-oss-plugin/common';
export type TagSavedObject = SavedObject<TagAttributes>;
export type TagWithRelations = Tag & {
    /**
     * The number of objects that are assigned to this tag.
     */
    relationCount: number;
};
export type { Tag, CreateTagOptions, TagAttributes, TagWithOptionalId, GetAllTagsOptions, ITagsClient, } from '@kbn/saved-objects-tagging-oss-plugin/common';
