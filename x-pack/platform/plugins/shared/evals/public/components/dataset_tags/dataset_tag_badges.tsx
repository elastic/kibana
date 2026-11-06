/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { DatasetMaturity } from '@kbn/evals-common';
import { getMaturityColor, getMaturityLabel } from './maturity';
import * as i18n from './translations';

interface DatasetTagBadgesProps {
  tags?: string[];
  maxVisibleTags?: number;
  onTagClick?: (tag: string) => void;
}

export const DatasetTagBadges: React.FC<DatasetTagBadgesProps> = ({
  tags,
  maxVisibleTags,
  onTagClick,
}) => {
  if (!tags?.length) {
    return null;
  }

  const visibleTags = maxVisibleTags === undefined ? tags : tags.slice(0, maxVisibleTags);
  const hiddenTags = tags.slice(visibleTags.length);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      alignItems="center"
      data-test-subj="datasetTagBadges"
    >
      {visibleTags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          {onTagClick ? (
            <EuiBadge
              color="hollow"
              onClick={(event: React.MouseEvent | React.KeyboardEvent) => {
                event.stopPropagation();
                onTagClick(tag);
              }}
              onClickAriaLabel={i18n.getFilterByTagAriaLabel(tag)}
            >
              {tag}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">{tag}</EuiBadge>
          )}
        </EuiFlexItem>
      ))}
      {hiddenTags.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={hiddenTags.join(', ')}>
            <EuiBadge color="hollow" tabIndex={0}>
              {i18n.getMoreTagsLabel(hiddenTags.length)}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

interface DatasetMaturityBadgeProps {
  maturity?: DatasetMaturity;
}

export const DatasetMaturityBadge: React.FC<DatasetMaturityBadgeProps> = ({ maturity }) => {
  if (!maturity) {
    return null;
  }

  return (
    <EuiBadge color={getMaturityColor(maturity)} data-test-subj="datasetMaturityBadge">
      {getMaturityLabel(maturity)}
    </EuiBadge>
  );
};
