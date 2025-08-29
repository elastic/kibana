/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import type { ToolTag } from '@kbn/onechat-common/tools';
import React from 'react';

interface OnechatToolTagsProps {
  tags: ToolTag[];
}

export const OnechatToolTags: React.FC<OnechatToolTagsProps> = ({ tags }) => {
  return (
    <EuiBadgeGroup>
      {tags.map((tag) => (
        <EuiBadge key={tag.value} color={tag.inherent ? 'subdued' : 'hollow'}>
          {tag.value}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
