/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { useDatasetSharing } from './use_dataset_sharing';
import * as i18n from './translations';

interface DatasetSpacesBadgeProps {
  spaceIds?: string[];
}

/**
 * Marks a dataset that reaches beyond the space being viewed. The common case,
 * a dataset that only lives here, gets no badge.
 */
export const DatasetSpacesBadge: React.FC<DatasetSpacesBadgeProps> = ({ spaceIds }) => {
  const { isEnabled, isShared, spaceCount, otherSpaceNames, hiddenSpaceCount } =
    useDatasetSharing(spaceIds);

  if (!isEnabled || !isShared) {
    return null;
  }

  const tooltip = otherSpaceNames.length
    ? i18n.getSharedTooltip(otherSpaceNames)
    : i18n.getHiddenSpacesTooltip(hiddenSpaceCount);

  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge color="hollow" iconType="spaces" tabIndex={0} data-test-subj="datasetSpacesBadge">
        {i18n.getSharedBadge(spaceCount)}
      </EuiBadge>
    </EuiToolTip>
  );
};
