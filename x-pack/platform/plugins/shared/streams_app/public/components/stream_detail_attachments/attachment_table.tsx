/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';
import { useTimefilter } from '../../hooks/use_timefilter';

export function AttachmentsTable({
  attachments,
  compact = false,
  selectedAttachments,
  setSelectedAttachments,
  loading,
  entityId,
  dataTestSubj,
}: {
  entityId?: string;
  loading: boolean;
  attachments: SanitizedDashboardAsset[] | undefined;
  compact?: boolean;
  selectedAttachments?: SanitizedDashboardAsset[];
  setSelectedAttachments?: (attachments: SanitizedDashboardAsset[]) => void;
  dataTestSubj?: string;
}) {
  const {
    core: { application },
    services: { telemetryClient },
    dependencies: {
      start: {
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
        share,
      },
    },
  } = useKibana();

  const { timeState } = useTimefilter();

  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const columns = useMemo((): Array<EuiBasicTableColumn<SanitizedDashboardAsset>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.attachmentTable.attachmentNameColumnTitle', {
          defaultMessage: 'Attachment name',
        }),
        render: (_, { title, id }) => (
          <EuiLink
            data-test-subj="streamsAppAttachmentColumnsLink"
            onClick={() => {
              if (entityId) {
                telemetryClient.trackAttachmentClick({
                  attachment_id: id,
                  attachment_type: 'dashboard',
                  name: entityId,
                });
              }
              const url = dashboardLocator?.getRedirectUrl(
                // @ts-expect-error upgrade typescript v5.9.3
                { dashboardId: id, timeRange: timeState.timeRange } || ''
              );
              if (url) {
                application.navigateToUrl(url);
              }
            }}
          >
            {title}
          </EuiLink>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.attachmentTable.attachmentTypeColumnTitle', {
          defaultMessage: 'Attachment type',
        }),
        render: () => {
          return i18n.translate('xpack.streams.attachmentTable.attachmentType', {
            defaultMessage: 'Dashboard',
          });
        },
      },
      ...(!compact
        ? ([
            {
              field: 'tags',
              name: i18n.translate('xpack.streams.attachmentTable.tagsColumnTitle', {
                defaultMessage: 'Tags',
              }),
              render: (_, { tags }) => {
                return (
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap>
                    <savedObjectsTaggingUi.components.TagList
                      object={{ references: tagListToReferenceList(tags) }}
                    />
                  </EuiFlexGroup>
                );
              },
            },
          ] satisfies Array<EuiBasicTableColumn<SanitizedDashboardAsset>>)
        : []),
    ];
  }, [
    application,
    compact,
    dashboardLocator,
    entityId,
    savedObjectsTaggingUi,
    telemetryClient,
    timeState,
  ]);

  const items = useMemo(() => {
    return attachments ?? [];
  }, [attachments]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        data-test-subj={dataTestSubj}
        columns={columns}
        itemId="id"
        items={items}
        loading={loading}
        selection={
          setSelectedAttachments
            ? { onSelectionChange: setSelectedAttachments, selected: selectedAttachments }
            : undefined
        }
      />
    </EuiFlexGroup>
  );
}
