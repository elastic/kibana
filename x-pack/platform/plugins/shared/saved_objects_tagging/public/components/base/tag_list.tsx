/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiBadgeGroup } from '@elastic/eui';
import type { TagWithOptionalId } from '../../../common/types';
import { TagBadge } from './tag_badge';

export interface TagListProps {
  tags: TagWithOptionalId[];
  onClick?: (tag: TagWithOptionalId) => void;
  tagRender?: (tag: TagWithOptionalId) => JSX.Element;
}

/**
 * Displays a list of tag
 */
export const TagList: FC<TagListProps> = ({ tags, onClick, tagRender }) => {
  return (
    <EuiBadgeGroup>
      {tags.map((tag) =>
        tagRender ? (
          <span key={tag.name}>{tagRender(tag)}</span>
        ) : (
          <TagBadge key={tag.name} tag={tag} onClick={onClick} />
        )
      )}
    </EuiBadgeGroup>
  );
};
