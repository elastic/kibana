/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { MemoryVersionRecord } from '../../services/memory/memory_service';
import { useMemoryEntry, useMemoryHistory, useMemoryMutations } from '../hooks/use_memory';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

export const AgentBuilderMemoryHistoryPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const { euiTheme } = useEuiTheme();
  const { data: entry } = useMemoryEntry(entryId);
  const { data: historyData, isLoading } = useMemoryHistory(entryId);
  const { rollbackEntry } = useMemoryMutations();

  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.memory.breadcrumb', {
        defaultMessage: 'Memory',
      }),
      path: appPaths.memory.list,
    },
    {
      text: entry?.title ?? '...',
      path: entryId ? appPaths.memory.entry({ entryId }) : appPaths.memory.list,
    },
    {
      text: i18n.translate('xpack.agentBuilder.memory.historyBreadcrumb', {
        defaultMessage: 'History',
      }),
      path: entryId ? appPaths.memory.history({ entryId }) : appPaths.memory.list,
    },
  ]);

  const handleRollback = useCallback(
    (version: number) => {
      if (entryId) {
        rollbackEntry.mutate({ entryId, version });
      }
    },
    [entryId, rollbackEntry]
  );

  const columns: Array<EuiBasicTableColumn<MemoryVersionRecord>> = [
    {
      field: 'version',
      name: i18n.translate('xpack.agentBuilder.memory.history.versionColumn', {
        defaultMessage: 'Version',
      }),
      width: '80px',
    },
    {
      field: 'change_type',
      name: i18n.translate('xpack.agentBuilder.memory.history.changeTypeColumn', {
        defaultMessage: 'Change',
      }),
      width: '100px',
      render: (changeType: string) => <EuiBadge>{changeType}</EuiBadge>,
    },
    {
      field: 'change_summary',
      name: i18n.translate('xpack.agentBuilder.memory.history.summaryColumn', {
        defaultMessage: 'Summary',
      }),
    },
    {
      field: 'created_by',
      name: i18n.translate('xpack.agentBuilder.memory.history.authorColumn', {
        defaultMessage: 'Author',
      }),
      width: '150px',
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.agentBuilder.memory.history.dateColumn', {
        defaultMessage: 'Date',
      }),
      width: '180px',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      name: i18n.translate('xpack.agentBuilder.memory.history.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '100px',
      render: (record: MemoryVersionRecord) => {
        const isCurrentVersion = entry && record.version === entry.version;
        return isCurrentVersion ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.memory.history.currentLabel', {
              defaultMessage: 'Current',
            })}
          </EuiText>
        ) : (
          <EuiButton
            size="s"
            onClick={() => handleRollback(record.version)}
            isLoading={rollbackEntry.isLoading}
          >
            {i18n.translate('xpack.agentBuilder.memory.history.rollbackButton', {
              defaultMessage: 'Rollback',
            })}
          </EuiButton>
        );
      },
    },
  ];

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMemoryHistoryPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.memory.history.title', {
          defaultMessage: 'Version History',
        })}
        description={entry?.title}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
      />
      <KibanaPageTemplate.Section>
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <EuiBasicTable
            items={historyData?.history ?? []}
            columns={columns}
            tableCaption={i18n.translate('xpack.agentBuilder.memory.history.tableCaption', {
              defaultMessage: 'Version history',
            })}
            data-test-subj="agentBuilderMemoryHistoryTable"
          />
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
