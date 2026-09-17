/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBasicTable, type EuiBasicTableColumn, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { DecisionTreeVersionSummary } from './types';

interface VersionHistoryProps {
  versions: DecisionTreeVersionSummary[];
  selectedVersion?: number;
  onSelectVersion: (version: number) => void;
}

export function VersionHistory({
  versions,
  selectedVersion,
  onSelectVersion,
}: VersionHistoryProps) {
  const columns: Array<EuiBasicTableColumn<DecisionTreeVersionSummary>> = [
    {
      field: 'version',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.versions.version', {
        defaultMessage: 'Version',
      }),
      width: '90px',
      render: (version: number) => <strong>{`v${version}`}</strong>,
    },
    {
      field: 'author',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.versions.author', {
        defaultMessage: 'Author',
      }),
      width: '160px',
    },
    {
      field: 'summary',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.versions.summary', {
        defaultMessage: 'Summary',
      }),
      render: (summary: string) =>
        summary.length > 0 ? (
          summary
        ) : (
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.significantEventsApp.decisionTrees.versions.noSummary', {
              defaultMessage: 'No summary',
            })}
          </EuiText>
        ),
    },
    {
      field: 'reinforced',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.versions.reinforced', {
        defaultMessage: 'Reinforced',
      }),
      width: '110px',
      render: (reinforced: boolean) =>
        reinforced ? (
          <EuiBadge color="success">
            {i18n.translate('xpack.significantEventsApp.decisionTrees.versions.reinforcedYes', {
              defaultMessage: 'Causal',
            })}
          </EuiBadge>
        ) : (
          <span>-</span>
        ),
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.versions.created', {
        defaultMessage: 'Updated',
      }),
      width: '150px',
      render: (createdAt: string) => <FormattedRelative value={createdAt} />,
    },
  ];

  return (
    <EuiBasicTable
      items={versions}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.translate(
        'xpack.significantEventsApp.decisionTrees.versions.tableCaption',
        { defaultMessage: 'Decision tree version history' }
      )}
      rowProps={(version: DecisionTreeVersionSummary) => ({
        onClick: () => onSelectVersion(version.version),
        isSelected: version.version === selectedVersion,
        style: { cursor: 'pointer' },
      })}
      data-test-subj="nightshiftDecisionTreeVersionHistory"
    />
  );
}
