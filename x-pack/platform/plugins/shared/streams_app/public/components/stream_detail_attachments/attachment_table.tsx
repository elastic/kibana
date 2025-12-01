/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type {
  Attachment,
  AttachmentType,
} from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import {
  ruleDetailsLocatorID,
  sloDetailsLocatorID,
  type SloDetailsLocatorParams,
  type RuleDetailsLocatorParams,
} from '@kbn/deeplinks-observability';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';
import { useTimefilter } from '../../hooks/use_timefilter';

const ATTACHMENT_TYPE_CONFIG: Record<AttachmentType, { label: string; icon: string }> = {
  dashboard: {
    label: i18n.translate('xpack.streams.attachmentTable.attachmentTypeDashboard', {
      defaultMessage: 'Dashboard',
    }),
    icon: 'dashboardApp',
  },
  rule: {
    label: i18n.translate('xpack.streams.attachmentTable.attachmentTypeRule', {
      defaultMessage: 'Rule',
    }),
    icon: 'bell',
  },
  slo: {
    label: i18n.translate('xpack.streams.attachmentTable.attachmentTypeSlo', {
      defaultMessage: 'SLO',
    }),
    icon: 'watchesApp',
  },
};

const ATTACHMENT_URL_GETTERS: Record<
  AttachmentType,
  (
    redirectId: string,
    locatorsService: LocatorClient,
    timeRange: { from: string; to: string }
  ) => string
> = {
  dashboard: (redirectId, locatorsService, timeRange) => {
    const dashboardLocator = locatorsService.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    return (
      dashboardLocator?.getRedirectUrl({
        dashboardId: redirectId,
        timeRange,
      }) || ''
    );
  },
  rule: (redirectId, locatorsService) => {
    const ruleLocator = locatorsService.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID);
    return ruleLocator?.getRedirectUrl({ ruleId: redirectId }) || '';
  },
  slo: (redirectId, locatorsService) => {
    const sloLocator = locatorsService.get<SloDetailsLocatorParams>(sloDetailsLocatorID);
    return sloLocator?.getRedirectUrl({ sloId: redirectId }) || '';
  },
};

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
  attachments: Attachment[] | undefined;
  compact?: boolean;
  selectedAttachments?: Attachment[];
  setSelectedAttachments?: (attachments: Attachment[]) => void;
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

  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();

  const tableStyles = css`
    & thead tr {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const columns = useMemo((): Array<EuiBasicTableColumn<Attachment>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.attachmentTable.titleColumnTitle', {
          defaultMessage: 'Title',
        }),
        render: (_, { title, id, redirectId, type }) => {
          const url = ATTACHMENT_URL_GETTERS[type](
            redirectId,
            share.url.locators,
            timeState.timeRange
          );

          if (!url) {
            return <EuiText size="s">{title}</EuiText>;
          }

          return (
            <EuiLink
              data-test-subj="streamsAppAttachmentColumnsLink"
              onClick={() => {
                if (entityId) {
                  telemetryClient.trackAttachmentClick({
                    attachment_id: id,
                    attachment_type: type,
                    name: entityId,
                  });
                }
                application.navigateToUrl(url);
              }}
            >
              {title}
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.attachmentTable.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
        render: (type: AttachmentType) => {
          const config = ATTACHMENT_TYPE_CONFIG[type];
          return (
            <EuiBadge color="hollow">
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={config.icon} size="s" color="subdued" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{config.label}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          );
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
          ] satisfies Array<EuiBasicTableColumn<Attachment>>)
        : []),
    ];
  }, [application, compact, share, entityId, savedObjectsTaggingUi, telemetryClient, timeState]);

  const items = useMemo(() => {
    return attachments ?? [];
  }, [attachments]);

  return (
    <EuiBasicTable
      css={tableStyles}
      tableCaption={i18n.translate('xpack.streams.attachmentTable.tableCaption', {
        defaultMessage: 'List of attachments',
      })}
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
  );
}
