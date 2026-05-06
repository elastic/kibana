/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiPopover, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export function AlertEpisodeTags({
  tags,
  size = 3,
  oneLine = false,
}: {
  tags: string[] | string | undefined;
  size?: number;
  oneLine?: boolean;
}) {
  const normalizedTags = Array.isArray(tags) ? tags : tags ? [tags] : [];
  const [isMoreTagsOpen, setIsMoreTagsOpen] = useState(false);
  const onMoreTagsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsMoreTagsOpen((isPopoverOpen) => !isPopoverOpen);
  };
  const closePopover = () => setIsMoreTagsOpen(false);
  const moreTags = normalizedTags.length > size && (
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
        values={{ number: normalizedTags.length - size }}
      />
    </EuiBadge>
  );

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap={!oneLine}
      responsive={false}
      alignItems="center"
      direction="row"
    >
      {normalizedTags.slice(0, size).map((tag) => (
        <EuiBadge key={tag} color="hollow">
          {tag}
        </EuiBadge>
      ))}
      {oneLine ? ' ' : <br />}
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.TAGS_MORE_POPOVER_ARIA_LABEL}
          button={moreTags}
          isOpen={isMoreTagsOpen}
          closePopover={closePopover}
        >
          {normalizedTags.slice(size).map((tag) => (
            <EuiBadge key={tag} color="hollow">
              {tag}
            </EuiBadge>
          ))}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
