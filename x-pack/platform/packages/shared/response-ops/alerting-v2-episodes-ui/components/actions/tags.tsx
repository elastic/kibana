/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export interface AlertEpisodeTagsProps {
  tags?: string[];
  /** How many tags to show before collapsing the rest into a `+N` popover. Ignored when `inline`. */
  size?: number;
  /**
   * When `true`, render the badges as inline siblings instead of a flex row, so they share the
   * line flow of the surrounding text and break one by one instead of as a block. Every tag is
   * rendered in this mode: the wrapping text handles the overflow, so there is no `+N` popover.
   */
  inline?: boolean;
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

export function AlertEpisodeTags({ tags = [], size = 3, inline = false }: AlertEpisodeTagsProps) {
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  };
  const closePopover = () => setIsMoreTagsOpen(false);
  const moreTags = tags.length > size && (
    <EuiBadge
      key="more"
      iconType="tag"
      onClick={onMoreTagsClick}
      onClickAriaLabel={i18n.TAGS_MORE_BADGE_ARIA_LABEL}
      color="hollow"
    >
      <FormattedMessage
        id="xpack.observability.component.tags.moreTags"
        defaultMessage="+{number}"
        values={{ number: tags.length - size }}
      />
    </EuiBadge>
  );

  if (inline) {
    return (
      <span css={inlineTagsCss}>
        {tags.map((tag, index) => (
          <Fragment key={tag}>
            {/* A real space keeps the badges apart and lets the line break between them. */}
            {index > 0 ? ' ' : null}
            <EuiBadge color="hollow">{tag}</EuiBadge>
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center" direction="row">
      {tags.slice(0, size).map((tag) => (
        <EuiBadge key={tag} color="hollow">
          {tag}
        </EuiBadge>
      ))}
      <br />
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.TAGS_MORE_POPOVER_ARIA_LABEL}
          button={moreTags}
          isOpen={isMoreTagsOpen}
          closePopover={closePopover}
        >
          {tags.slice(size).map((tag) => (
            <EuiBadge key={tag} color="hollow">
              {tag}
            </EuiBadge>
          ))}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
