/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EMPTY_VALUE } from '../../constants';
import * as i18n from './translations';

export interface TagBadgesProps {
  tags?: string[];
  /** How many tags to show before collapsing the rest into a `+N` popover. Ignored when `showAll`. */
  size?: number;
  /** Render every tag instead of collapsing the overflow into a `+N` popover. */
  showAll?: boolean;
  'data-test-subj'?: string;
}

/**
 * Box each badge into exactly one line of the surrounding text (`1lh`) and center it there.
 * A hollow badge is 20px tall, so left to size itself it makes its line taller than the rest.
 * `vertical-align: top` keeps the box from growing the line, which top and bottom aligned boxes
 * only do when they do not fit.
 */
const inlineTagsCss = css`
  > * {
    display: inline-flex;
    align-items: center;
    block-size: 1lh;
    vertical-align: top;
  }
`;

export function TagBadges({
  tags = [],
  size = 3,
  showAll = false,
  'data-test-subj': dataTestSubj,
}: TagBadgesProps) {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  };
  const closePopover = () => setIsMoreTagsOpen(false);

  if (tags.length === 0) {
    return <span data-test-subj={dataTestSubj}>{EMPTY_VALUE}</span>;
  }

  const visibleTags = showAll ? tags : tags.slice(0, size);
  const hiddenTags = showAll ? [] : tags.slice(size);

  return (
    <span css={inlineTagsCss} data-test-subj={dataTestSubj}>
      {visibleTags.map((tag, index) => (
        <Fragment key={tag}>
          {/* A real space keeps the badges apart and lets the line break between them. */}
          {index > 0 ? ' ' : null}
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </Fragment>
      ))}
      {hiddenTags.length > 0 ? (
        <>
          {visibleTags.length > 0 ? ' ' : null}
          <EuiPopover
            aria-label={i18n.TAGS_MORE_POPOVER_ARIA_LABEL}
            button={
              <EuiBadge
                iconType="tag"
                onClick={onMoreTagsClick}
                onClickAriaLabel={i18n.TAGS_MORE_BADGE_ARIA_LABEL}
                color="hollow"
              >
                <FormattedMessage
                  id="xpack.observability.component.tags.moreTags"
                  defaultMessage="+{number}"
                  values={{ number: hiddenTags.length }}
                />
              </EuiBadge>
            }
            isOpen={isMoreTagsOpen}
            closePopover={closePopover}
          >
            {hiddenTags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiPopover>
        </>
      ) : null}
    </span>
  );
}
