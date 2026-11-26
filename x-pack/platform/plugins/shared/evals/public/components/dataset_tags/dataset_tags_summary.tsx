/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { DatasetMaturity } from '@kbn/evals-common';
import { DatasetMaturityBadge, DatasetTagBadges } from './dataset_tag_badges';
import * as i18n from './translations';

const LabelledBadges: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{children}</EuiFlexItem>
  </EuiFlexGroup>
);

interface DatasetTagsSummaryProps {
  maturity?: DatasetMaturity;
  tags?: string[];
}

/**
 * Labelled maturity and tags for the dataset detail page.
 */
export const DatasetTagsSummary: React.FC<DatasetTagsSummaryProps> = ({ maturity, tags }) => {
  if (!maturity && !tags?.length) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="l"
      alignItems="flexStart"
      responsive={false}
      wrap
      data-test-subj="datasetTagsSummary"
    >
      {maturity ? (
        <EuiFlexItem grow={false}>
          <LabelledBadges label={i18n.MATURITY_LABEL}>
            <DatasetMaturityBadge maturity={maturity} />
          </LabelledBadges>
        </EuiFlexItem>
      ) : null}
      {tags?.length ? (
        <EuiFlexItem grow={false}>
          <LabelledBadges label={i18n.TAGS_LABEL}>
            <DatasetTagBadges tags={tags} />
          </LabelledBadges>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
