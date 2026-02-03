/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useState } from 'react';

import { EuiFlexItem, EuiFlexGroup, EuiBasicTable, EuiText } from '@elastic/eui';
import type { Criteria } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CaseUI } from '../../../../common/ui/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { useKibana } from '../../../common/lib/kibana';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { isRegisteredAttachmentType } from '../../../../common/utils/attachments';
import type { RegisteredAttachment } from '../../../../common/types/domain';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { DashboardMetadata } from './use_dashboard_metadata';
import { getDashboardUrl } from './utils';
import { DashboardLink } from './dashboard_link';

interface DashboardAttachment {
  id: string;
  attachmentId: string;
  createdAt: string;
  createdBy: {
    username: string | null | undefined;
    fullName: string | null | undefined;
    email: string | null | undefined;
  };
  title?: string;
  inAppUrl?: string;
}

const isDashboardAttachment = (
  attachment: CaseUI['comments'][number]
): attachment is SnakeToCamelCase<RegisteredAttachment> => {
  return (
    isRegisteredAttachmentType(attachment.type) &&
    attachment.type === DASHBOARD_ATTACHMENT_TYPE &&
    Boolean((attachment as SnakeToCamelCase<RegisteredAttachment>).attachmentId)
  );
};

interface DashboardListProps {
  caseData: CaseUI;
  searchTerm?: string;
  isLoading?: boolean;
}

export const DashboardList = ({ caseData, searchTerm, isLoading = false }: DashboardListProps) => {
  const { application, http } = useKibana().services;
  const { attachmentTypeRegistry } = useCasesContext();
  const [paginationState, setPaginationState] = useState({ pageIndex: 0, pageSize: 10 });

  const dashboardAttachmentsBase: Array<{
    id: string;
    attachmentId: string;
    createdAt: string;
    createdBy: {
      username: string | null | undefined;
      fullName: string | null | undefined;
      email: string | null | undefined;
    };
  }> = useMemo(() => {
    const attachments = caseData.comments || [];
    const filtered = attachments.filter(isDashboardAttachment);

    // Apply search term filter if provided
    const searchFiltered = searchTerm
      ? filtered.filter((attachment: SnakeToCamelCase<RegisteredAttachment>) => {
          const id = attachment.attachmentId || '';
          const searchLower = searchTerm.toLowerCase();
          return id.toLowerCase().includes(searchLower);
        })
      : filtered;

    return searchFiltered.map((attachment: SnakeToCamelCase<RegisteredAttachment>) => {
      const attachmentId = attachment.attachmentId;
      if (!attachmentId) {
        // This should not happen due to type guard, but TypeScript needs this
        throw new Error('Invalid dashboard attachment');
      }
      return {
        id: attachment.id,
        attachmentId,
        createdAt: attachment.createdAt,
        createdBy: attachment.createdBy,
      };
    });
  }, [caseData.comments, searchTerm]);

  // Get attachment IDs for metadata fetching
  const attachmentIds = useMemo(
    () => dashboardAttachmentsBase.map((attachment) => attachment.attachmentId),
    [dashboardAttachmentsBase]
  );

  // Use registered metadata fetcher
  const dashboardType = attachmentTypeRegistry.get(DASHBOARD_ATTACHMENT_TYPE);
  const metadataFetcher = dashboardType?.getAttachmentMetadataFetcher?.();
  const metadataResult = metadataFetcher?.useAttachmentMetadata?.(attachmentIds);
  const dashboardMetadata = useMemo(
    () => (metadataResult?.metadata ?? {}) as Record<string, DashboardMetadata>,
    [metadataResult?.metadata]
  );
  const isLoadingMetadata = metadataResult?.isLoading ?? false;

  const dashboardAttachments: DashboardAttachment[] = useMemo(() => {
    return dashboardAttachmentsBase.map((attachment) => {
      const key = `dashboard:${attachment.attachmentId}`;
      const metadata = dashboardMetadata[key];
      return {
        ...attachment,
        title: metadata?.title || attachment.attachmentId,
        inAppUrl: metadata?.inAppUrl?.path,
      };
    });
  }, [dashboardAttachmentsBase, dashboardMetadata]);

  const handleRowClick = useCallback(
    (dashboard: DashboardAttachment) => {
      const url = getDashboardUrl(dashboard.attachmentId, dashboard.inAppUrl);
      application.navigateToUrl(http.basePath.prepend(url));
    },
    [application, http.basePath]
  );

  const columns = useMemo(
    () => [
      {
        field: 'title',
        name: i18n.translate('xpack.cases.caseView.dashboards.table.titleColumn', {
          defaultMessage: 'Title',
        }),
        'data-test-subj': 'dashboardsTableRowTitle',
        render: (title: string, item: DashboardAttachment) => {
          return (
            <DashboardLink
              attachmentId={item.attachmentId}
              title={title}
              inAppUrl={item.inAppUrl}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleRowClick(item);
              }}
              data-test-subj={`dashboardsTableRowLink-${item.attachmentId}`}
            />
          );
        },
      },
      {
        field: 'createdAt',
        name: i18n.translate('xpack.cases.caseView.dashboards.table.createdAtColumn', {
          defaultMessage: 'Created',
        }),
        width: '200px',
        'data-test-subj': 'dashboardsTableRowCreatedAt',
        render: (date: string) => new Date(date).toLocaleString(),
      },
    ],
    [handleRowClick]
  );

  const onTableChange = useCallback(({ page }: Criteria<DashboardAttachment>) => {
    if (page) {
      setPaginationState({
        pageIndex: page.index,
        pageSize: page.size,
      });
    }
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex: paginationState.pageIndex,
      pageSize: paginationState.pageSize,
      totalItemCount: dashboardAttachments.length,
      pageSizeOptions: [10, 25, 50],
      showPerPageOptions: true,
    }),
    [paginationState.pageIndex, paginationState.pageSize, dashboardAttachments.length]
  );

  const paginatedItems = useMemo(() => {
    const startIndex = paginationState.pageIndex * paginationState.pageSize;
    const endIndex = startIndex + paginationState.pageSize;
    return dashboardAttachments.slice(startIndex, endIndex);
  }, [dashboardAttachments, paginationState.pageIndex, paginationState.pageSize]);

  if (dashboardAttachments.length === 0 && !isLoading) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText color="subdued" data-test-subj="case-view-dashboards-empty">
            {i18n.translate('xpack.cases.caseView.dashboards.empty', {
              defaultMessage: 'No dashboards attached to this case',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <div data-test-subj="case-view-dashboards-table">
          <EuiBasicTable
            loading={isLoading || isLoadingMetadata}
            itemId="id"
            items={paginatedItems}
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            rowProps={(item) => ({
              'data-test-subj': `dashboardsTableRow row-${item.attachmentId}`,
            })}
            tableCaption={i18n.translate('xpack.cases.caseView.dashboards.table.caption', {
              defaultMessage: 'Dashboards attached to this case',
            })}
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

DashboardList.displayName = 'DashboardList';
