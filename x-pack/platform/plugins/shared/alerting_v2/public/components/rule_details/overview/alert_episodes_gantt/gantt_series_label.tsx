/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

const MAX_LABEL_WIDTH_PX = 220;

const shortGroupHash = (groupHash: string): string =>
  groupHash.length <= 14 ? groupHash : `${groupHash.slice(0, 12)}…`;

/**
 * Format `groupingValues` into a compact `field=value` summary; fall back to
 * the truncated group_hash when no values are present. Dotted field names are
 * shortened to the last segment (`host.name` → `name`) to fit narrow rows.
 */
const formatSeriesLabel = (
  groupHash: string,
  groupingValues: Record<string, string | null>
): string => {
  const entries = Object.entries(groupingValues).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return shortGroupHash(groupHash);
  return entries
    .map(([field, value]) => {
      const lastSegment = field.split('.').pop() ?? field;
      return `${lastSegment}=${value as string}`;
    })
    .join(' · ');
};

export interface GanttSeriesLabelProps {
  groupHash: string;
  groupingValues: Record<string, string | null>;
}

/**
 * Two-line meta for a Gantt row: the formatted series label on top and the
 * short hash underneath in a subdued monospace tone (skipped when the label
 * already IS the hash, i.e. ungrouped rules).
 */
export const GanttSeriesLabel: React.FC<GanttSeriesLabelProps> = ({
  groupHash,
  groupingValues,
}) => {
  const label = formatSeriesLabel(groupHash, groupingValues);
  const hash = shortGroupHash(groupHash);
  const showHash = label !== hash;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          className="eui-textTruncate"
          style={{ maxWidth: MAX_LABEL_WIDTH_PX }}
          data-test-subj="ganttSeriesLabel"
        >
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
      {showHash && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <code>{hash}</code>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
