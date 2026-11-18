/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiInMemoryTable, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { WebCrawl, WebCrawlStatus } from '../../common/types';

const STATUS_BADGES: Record<WebCrawlStatus, { color: string; label: string }> = {
  running: {
    color: 'primary',
    label: i18n.translate('xpack.webCrawler.crawls.status.running', {
      defaultMessage: 'Running',
    }),
  },
  completed: {
    color: 'success',
    label: i18n.translate('xpack.webCrawler.crawls.status.completed', {
      defaultMessage: 'Completed',
    }),
  },
  failed: {
    color: 'danger',
    label: i18n.translate('xpack.webCrawler.crawls.status.failed', {
      defaultMessage: 'Failed',
    }),
  },
  canceled: {
    color: 'hollow',
    label: i18n.translate('xpack.webCrawler.crawls.status.canceled', {
      defaultMessage: 'Stopped',
    }),
  },
};

const STOPPING_LABEL = i18n.translate('xpack.webCrawler.crawls.status.stopping', {
  defaultMessage: 'Stopping',
});

const formatDuration = ({ startedAt, finishedAt }: WebCrawl): string => {
  if (!finishedAt) {
    return '';
  }
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  return seconds < 60
    ? i18n.translate('xpack.webCrawler.crawls.duration.seconds', {
        defaultMessage: '{seconds}s',
        values: { seconds },
      })
    : i18n.translate('xpack.webCrawler.crawls.duration.minutes', {
        defaultMessage: '{minutes}m {seconds}s',
        values: { minutes: Math.floor(seconds / 60), seconds: seconds % 60 },
      });
};

export interface WebCrawlsTableProps {
  crawls: WebCrawl[];
  isLoading: boolean;
  /** Whether the user can create the workflow a schedule consists of. */
  canSchedule: boolean;
  /** A stop or delete request is in flight, so another one would race it. */
  isActing: boolean;
  getIndexUrl: (indexName: string) => string | undefined;
  getWorkflowUrl: (workflowId: string) => string;
  onStop: (crawl: WebCrawl) => void;
  onCrawlAgain: (crawl: WebCrawl) => void;
  onSchedule: (crawl: WebCrawl) => void;
  onDelete: (crawl: WebCrawl) => void;
}

export const WebCrawlsTable = ({
  crawls,
  isLoading,
  canSchedule,
  isActing,
  getIndexUrl,
  getWorkflowUrl,
  onStop,
  onCrawlAgain,
  onSchedule,
  onDelete,
}: WebCrawlsTableProps) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WebCrawl>>>(
    () => [
      {
        field: 'url',
        name: i18n.translate('xpack.webCrawler.crawls.columns.site', {
          defaultMessage: 'Site',
        }),
        truncateText: true,
        sortable: true,
        render: (url: string) => (
          <EuiLink href={url} target="_blank" external>
            {url}
          </EuiLink>
        ),
      },
      {
        field: 'indexName',
        name: i18n.translate('xpack.webCrawler.crawls.columns.index', {
          defaultMessage: 'Index',
        }),
        truncateText: true,
        sortable: true,
        render: (indexName: string) => {
          const href = getIndexUrl(indexName);
          return href ? <EuiLink href={href}>{indexName}</EuiLink> : indexName;
        },
      },
      {
        field: 'status',
        name: i18n.translate('xpack.webCrawler.crawls.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '110px',
        sortable: true,
        render: (status: WebCrawlStatus, { error, isStopping }: WebCrawl) => {
          const { color, label } = STATUS_BADGES[status];
          const badge = (
            <EuiBadge color={color} tabIndex={error ? 0 : undefined}>
              {isStopping ? STOPPING_LABEL : label}
            </EuiBadge>
          );
          return error ? <EuiToolTip content={error}>{badge}</EuiToolTip> : badge;
        },
      },
      {
        field: 'documentsCount',
        name: i18n.translate('xpack.webCrawler.crawls.columns.pages', {
          defaultMessage: 'Pages',
        }),
        width: '190px',
        sortable: true,
        render: (
          documentsCount: number,
          { status, failedCount, queuedCount, requestedCount, maxDocuments }: WebCrawl
        ) => (
          <EuiText size="s">
            {status === 'running'
              ? i18n.translate('xpack.webCrawler.crawls.pages.running', {
                  defaultMessage:
                    '{documentsCount} indexed, {inProgressCount} in progress, {queuedCount} queued',
                  values: {
                    documentsCount,
                    inProgressCount: Math.max(0, requestedCount - documentsCount - failedCount),
                    queuedCount,
                  },
                })
              : i18n.translate('xpack.webCrawler.crawls.pages.finished', {
                  defaultMessage:
                    '{documentsCount} of at most {maxDocuments} indexed{failedCount, plural, =0 {} other {, # failed}}',
                  values: { documentsCount, maxDocuments, failedCount },
                })}
          </EuiText>
        ),
      },
      {
        field: 'startedAt',
        name: i18n.translate('xpack.webCrawler.crawls.columns.started', {
          defaultMessage: 'Started',
        }),
        width: '140px',
        sortable: true,
        render: (startedAt: string) => <FormattedRelative value={new Date(startedAt)} />,
      },
      {
        name: i18n.translate('xpack.webCrawler.crawls.columns.duration', {
          defaultMessage: 'Duration',
        }),
        width: '90px',
        render: (crawl: WebCrawl) => formatDuration(crawl),
      },
      {
        name: i18n.translate('xpack.webCrawler.crawls.columns.startedBy', {
          defaultMessage: 'Started by',
        }),
        width: '130px',
        render: ({ startedBy, workflowId }: WebCrawl) =>
          workflowId ? (
            <EuiLink href={getWorkflowUrl(workflowId)}>
              {i18n.translate('xpack.webCrawler.crawls.startedByWorkflow', {
                defaultMessage: 'Workflow',
              })}
            </EuiLink>
          ) : (
            startedBy ?? ''
          ),
      },
      {
        name: i18n.translate('xpack.webCrawler.crawls.columns.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('xpack.webCrawler.crawls.actions.stop', {
              defaultMessage: 'Stop',
            }),
            description: i18n.translate('xpack.webCrawler.crawls.actions.stopHint', {
              defaultMessage: 'Stop this crawl and keep the pages it indexed',
            }),
            icon: 'stop',
            type: 'icon',
            available: ({ status }) => status === 'running',
            enabled: ({ isStopping }) => !isStopping && !isActing,
            onClick: onStop,
            'data-test-subj': 'webCrawlsStop',
          },
          {
            name: i18n.translate('xpack.webCrawler.crawls.actions.crawlAgain', {
              defaultMessage: 'Crawl again',
            }),
            description: i18n.translate('xpack.webCrawler.crawls.actions.crawlAgainHint', {
              defaultMessage: 'Crawl this site again with the same limits',
            }),
            icon: 'refresh',
            type: 'icon',
            available: ({ status }) => status !== 'running',
            onClick: onCrawlAgain,
            'data-test-subj': 'webCrawlsCrawlAgain',
          },
          {
            name: i18n.translate('xpack.webCrawler.crawls.actions.schedule', {
              defaultMessage: 'Schedule',
            }),
            description: i18n.translate('xpack.webCrawler.crawls.actions.scheduleHint', {
              defaultMessage: 'Crawl this site on a recurring schedule',
            }),
            icon: 'calendar',
            type: 'icon',
            available: () => canSchedule,
            onClick: onSchedule,
            'data-test-subj': 'webCrawlsSchedule',
          },
          {
            name: i18n.translate('xpack.webCrawler.crawls.actions.delete', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('xpack.webCrawler.crawls.actions.deleteHint', {
              defaultMessage: 'Remove this crawl from the history. The index is kept.',
            }),
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            available: ({ status }) => status !== 'running',
            enabled: () => !isActing,
            onClick: onDelete,
            'data-test-subj': 'webCrawlsDelete',
          },
        ],
      },
    ],
    [canSchedule, isActing, getIndexUrl, getWorkflowUrl, onStop, onCrawlAgain, onSchedule, onDelete]
  );

  return (
    <EuiInMemoryTable
      items={crawls}
      itemId="id"
      columns={columns}
      loading={isLoading}
      pagination={{ initialPageSize: 20, pageSizeOptions: [20, 50, 100] }}
      sorting={{ sort: { field: 'startedAt', direction: 'desc' } }}
      tableCaption={i18n.translate('xpack.webCrawler.crawls.tableCaption', {
        defaultMessage: 'Running and past web crawls',
      })}
      noItemsMessage={i18n.translate('xpack.webCrawler.crawls.noCrawls', {
        defaultMessage: 'No crawls yet. Enter a URL above to start one.',
      })}
      data-test-subj="webCrawlsTable"
    />
  );
};
