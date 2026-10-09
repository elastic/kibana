/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const POPOVER_TITLE = i18n.translate('xpack.osquery.tagsColumn.popoverTitle', {
  defaultMessage: 'Tags',
});

const popoverWrapperCss = {
  maxHeight: 200,
  maxWidth: 600,
  overflow: 'auto' as const,
};

interface TagsColumnProps {
  tags: string[];
}

const TagsColumnComponent: React.FC<TagsColumnProps> = ({ tags }) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  if (!tags || tags.length === 0) {
    return <>{'\u2014'}</>;
  }

  const badgeButton = (
    <EuiBadge
      iconType="tag"
      color="hollow"
      onClick={togglePopover}
      onClickAriaLabel={`${tags.length} ${POPOVER_TITLE}`}
      data-test-subj="tagsColumnBadge"
    >
      {tags.length}
    </EuiBadge>
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="tagsColumn">
      <EuiFlexItem grow={false}>
        <EuiPopover
          ownFocus
          button={badgeButton}
          isOpen={isOpen}
          closePopover={closePopover}
          repositionOnScroll
          data-test-subj="tagsColumnPopover"
          aria-label={POPOVER_TITLE}
        >
          <EuiPopoverTitle>{POPOVER_TITLE}</EuiPopoverTitle>
          <EuiBadgeGroup css={popoverWrapperCss}>
            {tags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

TagsColumnComponent.displayName = 'TagsColumn';

export const TagsColumn = React.memo(TagsColumnComponent);
