/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

// Shared by both the rule and episode summary badge rows: once the combined (non-tag + tag)
// badge count exceeds OVERFLOW_THRESHOLD, only MAX_VISIBLE_BADGES stay visible and the rest
// collapse into a single "+N" badge. Mirrors the app header's own badge row (`AppBadges`).
export const BADGE_ROW_MAX_VISIBLE_BADGES = 2;
export const BADGE_ROW_OVERFLOW_THRESHOLD = 3;

/**
 * Given how many non-tag badges (kind, status, severity, etc.) already sit in the same row,
 * returns the tag-specific `overflowSize`/`maxVisible` for {@link TagsOverflowBadgeRow}.
 */
export const getTagsOverflowLimits = (nonTagBadgeCount: number) => ({
  overflowSize: Math.max(0, BADGE_ROW_OVERFLOW_THRESHOLD - nonTagBadgeCount),
  maxVisible: Math.max(0, BADGE_ROW_MAX_VISIBLE_BADGES - nonTagBadgeCount),
});

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
 * Used by both the rule summary flyout and the episode details flyout badge rows — no existing
 * chrome/sharedux component covers "plain string tags with a +N overflow badge" (the closest,
 * `@kbn/content-management-tags`, is bound to the saved-object tag registry and doesn't
 * implement overflow), so this is the shared home for that behavior instead of duplicating it
 * per consumer.
 */
export const TagsOverflowBadgeRow: React.FC<TagsOverflowBadgeRowProps> = ({
  tags,
  overflowSize,
  maxVisible,
  'data-test-subj': dataTestSubj,
}) => {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const shouldOverflow = tags.length > overflowSize;
  const visibleCount = shouldOverflow ? maxVisible : tags.length;
  const visibleTags = tags.slice(0, visibleCount);
  const overflowTags = tags.slice(visibleCount);

  if (tags.length === 0) {
    return null;
  }

  const moreTagsButton = shouldOverflow && (
    <EuiBadge
      key="more"
      onClick={() => setIsMoreTagsOpen((isOpen) => !isOpen)}
      onClickAriaLabel={i18n.translate(
        'xpack.alertingV2EpisodesUi.actions.tagsOverflowBadgeRow.moreTagsAriaLabel',
        {
          defaultMessage: 'Show {count} more tags',
          values: { count: overflowTags.length },
        }
      )}
      color="hollow"
      data-test-subj="tagsOverflowBadgeRowMoreBadge"
    >
      <FormattedMessage
        id="xpack.alertingV2EpisodesUi.actions.tagsOverflowBadgeRow.moreTags"
        defaultMessage="+{number}"
        values={{ number: overflowTags.length }}
      />
    </EuiBadge>
  );

  return (
    <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap={false}>
        {visibleTags.map((tag) => (
          <EuiFlexItem key={tag} grow={false}>
            <EuiBadge color="hollow">{tag}</EuiBadge>
          </EuiFlexItem>
        ))}
        {moreTagsButton && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={i18n.translate(
                'xpack.alertingV2EpisodesUi.actions.tagsOverflowBadgeRow.moreTagsPopoverLabel',
                { defaultMessage: 'More tags' }
              )}
              button={moreTagsButton}
              isOpen={isMoreTagsOpen}
              closePopover={() => setIsMoreTagsOpen(false)}
              // EuiPopover defaults its anchor to `display: inline-block`, which misaligns the
              // "+N" badge against its plain sibling badges in the flex row.
              display="flex"
            >
              <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
                {overflowTags.map((tag) => (
                  <EuiFlexItem key={tag} grow={false}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
