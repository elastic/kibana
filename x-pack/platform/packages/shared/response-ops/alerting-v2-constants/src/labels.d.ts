/** Maximum length of a single tag (label). Matches the server's `tagsSchema`. */
export declare const MAX_TAG_LENGTH = 128;
/** Maximum number of tags allowed on a single resource. Matches the server's `tagsSchema`. */
export declare const MAX_TAGS = 20;
/**
 * Number of tags the rule and action policy tag endpoints return, applied as the
 * size of their terms aggregation. Tag pickers read it too, to tell the user that
 * the list is truncated and that searching reaches the rest.
 */
export declare const TAGS_RESPONSE_LIMIT = 20;
