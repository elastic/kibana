import React from 'react';
export declare const BADGE_ROW_MAX_VISIBLE_BADGES = 2;
export declare const BADGE_ROW_OVERFLOW_THRESHOLD = 3;
/**
 * Given how many non-tag badges (kind, status, severity, etc.) already sit in the same row,
 * returns the tag-specific `overflowSize`/`maxVisible` for {@link TagsOverflowBadgeRow}.
 */
export declare const getTagsOverflowLimits: (nonTagBadgeCount: number) => {
    overflowSize: number;
    maxVisible: number;
};
export interface TagsOverflowBadgeRowProps {
    tags: string[];
    /** Tags stay individually visible until `tags.length` exceeds this. */
    overflowSize: number;
    /** How many tags stay visible once overflow kicks in; the rest fold into "+N". */
    maxVisible: number;
    'data-test-subj'?: string;
}
/**
 * Renders tags as hollow badges, collapsing into a "+N" popover once they exceed `overflowSize`.
 * Used by the rule summary flyout badge row — no existing chrome/sharedux component covers
 * "plain string tags with a +N overflow badge" (the closest, `@kbn/content-management-tags`, is
 * bound to the saved-object tag registry and doesn't implement overflow), so this package owns
 * that behavior and can be reused by future consumers instead of duplicating it.
 */
export declare const TagsOverflowBadgeRow: React.FC<TagsOverflowBadgeRowProps>;
