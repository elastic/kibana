export type { TagsCapabilities } from './capabilities';
export { getTagsCapabilities } from './capabilities';
export { tagFeatureId, tagSavedObjectTypeName, tagManagementSectionId } from './constants';
export type { TagValidation } from './validation';
export { validateTagColor, validateTagName, validateTagDescription, tagNameMinLength, tagNameMaxLength, tagDescriptionMaxLength, } from './validation';
export { getRandomColor } from './random_color';
export { convertTagNameToId, getObjectTags, getTag, getTagIdsFromReferences, getTagsFromReferences, replaceTagReferences, tagIdToReference, } from './references';
