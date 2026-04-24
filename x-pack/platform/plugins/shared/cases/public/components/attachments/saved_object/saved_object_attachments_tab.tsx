/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CaseUI, AttachmentUIV2 } from '../../../../common/ui/types';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';

interface SavedObjectAttachmentsTabConfig {
  attachmentTypeId: string;
  savedObjectType: string;
  icon: string;
}

interface TableRow {
  id: string;
  title: string;
  href?: string;
}

interface BulkGetItem {
  id: string;
  type: string;
  meta?: {
    inAppUrl?: { path?: string; uiCapabilitiesPath?: string };
  };
}

const toAttachmentIds = (comment: AttachmentUIV2): string[] => {
  const value = (comment as unknown as { attachmentId?: string | string[] }).attachmentId;
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value;
  return [];
};

const getMetadataTitle = (comment: AttachmentUIV2): string | undefined => {
  const metadata = (comment as unknown as { metadata?: Record<string, unknown> }).metadata;
  if (metadata && typeof metadata.title === 'string') return metadata.title;
  return undefined;
};

export const makeSavedObjectAttachmentsTab = (config: SavedObjectAttachmentsTabConfig) => {
  const SavedObjectAttachmentsTab: React.FC<{ caseData: CaseUI }> = ({ caseData }) => {
    const {
      services: { http, application },
    } = useKibana();

    const attachmentsOfType = useMemo(
      () => caseData.comments.filter((comment) => comment.type === config.attachmentTypeId),
      [caseData.comments]
    );

    const items = useMemo<TableRow[]>(() => {
      const rows: TableRow[] = [];
      for (const comment of attachmentsOfType) {
        const title = getMetadataTitle(comment);
        for (const id of toAttachmentIds(comment)) {
          rows.push({ id, title: title ?? id });
        }
      }
      return rows;
    }, [attachmentsOfType]);

    const [hrefsById, setHrefsById] = useState<Record<string, string | undefined>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
      if (items.length === 0) {
        setHrefsById({});
        return;
      }

      let cancelled = false;
      const fetchMetadata = async () => {
        setIsLoading(true);
        try {
          const response = await http.post<BulkGetItem[]>(
            '/api/kibana/management/saved_objects/_bulk_get',
            {
              body: JSON.stringify(items.map(({ id }) => ({ id, type: config.savedObjectType }))),
            }
          );
          if (cancelled) return;
          const next: Record<string, string | undefined> = {};
          for (const entry of response ?? []) {
            const inAppUrl = entry.meta?.inAppUrl;
            const path = inAppUrl?.path;
            if (!path) {
              next[entry.id] = undefined;
              continue;
            }
            const uiCapabilitiesPath = inAppUrl?.uiCapabilitiesPath;
            const canGo = uiCapabilitiesPath
              ? uiCapabilitiesPath.split('.').reduce<unknown>(
                  (acc, segment) =>
                    typeof acc === 'object' && acc !== null
                      ? (acc as Record<string, unknown>)[segment]
                      : undefined,
                  application.capabilities
                )
              : true;
            next[entry.id] = canGo ? http.basePath.prepend(path) : undefined;
          }
          setHrefsById(next);
        } catch {
          if (!cancelled) setHrefsById({});
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      };

      fetchMetadata();
      return () => {
        cancelled = true;
      };
    }, [items, http, application.capabilities]);

    const columns: Array<EuiBasicTableColumn<TableRow>> = useMemo(
      () => [
        {
          field: 'title',
          name: i18n.COLUMN_NAME,
          render: (_: unknown, row: TableRow) => {
            const href = hrefsById[row.id];
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={config.icon} size="m" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {href ? (
                    <EuiLink
                      href={href}
                      target="_blank"
                      data-test-subj={`cases-so-tab-link-${row.id}`}
                    >
                      {row.title}
                    </EuiLink>
                  ) : (
                    <EuiText size="s">{row.title}</EuiText>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
        },
      ],
      [hrefsById]
    );

    return (
      <EuiBasicTable<TableRow>
        items={items}
        columns={columns}
        itemId="id"
        loading={isLoading}
        noItemsMessage={i18n.NO_ITEMS}
        tableCaption={config.attachmentTypeId}
        data-test-subj={`cases-so-tab-table-${config.attachmentTypeId}`}
      />
    );
  };

  SavedObjectAttachmentsTab.displayName = `SavedObjectAttachmentsTab(${config.attachmentTypeId})`;
  return SavedObjectAttachmentsTab;
};
