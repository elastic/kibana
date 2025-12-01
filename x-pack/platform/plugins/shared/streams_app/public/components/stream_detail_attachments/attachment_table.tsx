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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
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
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';
import { useTimefilter } from '../../hooks/use_timefilter';

const ATTACHMENT_TYPE_CONFIG: Record<AttachmentType, { label: string; icon: EuiIconType }> = {
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
  ) => string | undefined
> = {
  dashboard: (redirectId, locatorsService, timeRange) => {
    const dashboardLocator = locatorsService.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    return dashboardLocator?.getRedirectUrl({
      dashboardId: redirectId,
      timeRange,
    });
  },
  rule: (redirectId, locatorsService) => {
    const ruleLocator = locatorsService.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID);
    return ruleLocator?.getRedirectUrl({ ruleId: redirectId });
  },
  slo: (redirectId, locatorsService) => {
    const sloLocator = locatorsService.get<SloDetailsLocatorParams>(sloDetailsLocatorID);
    return sloLocator?.getRedirectUrl({ sloId: redirectId });
  },
};

export function AttachmentsTable({
  attachments,
  compact = false,
  showActions = true,
  selectedAttachments,
  setSelectedAttachments,
  onUnlinkAttachment,
  loading,
  entityId,
  dataTestSubj,
}: {
  entityId?: string;
  loading: boolean;
  attachments: Attachment[] | undefined;
  compact?: boolean;
  showActions?: boolean;
  selectedAttachments?: Attachment[];
  setSelectedAttachments?: (attachments: Attachment[]) => void;
  onUnlinkAttachment?: (attachment: Attachment) => void;
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

  const navigateToAttachment = useCallback(
    ({ attachment, url }: { attachment: Attachment; url: string }) => {
      if (entityId) {
        telemetryClient.trackAttachmentClick({
          attachment_id: attachment.id,
          attachment_type: attachment.type,
          name: entityId,
        });
      }
      application.navigateToUrl(url);
    },
    [application, entityId, telemetryClient]
  );

  const columns = useMemo((): Array<EuiBasicTableColumn<Attachment>> => {
    const detailsColumn: EuiBasicTableColumn<Attachment> = {
      field: 'details',
      name: '',
      width: '40px',
      render: (_, attachment) => (
        <EuiButtonIcon
          data-test-subj="streamsAppAttachmentDetailsButton"
          iconType="expand"
          aria-label={i18n.translate('xpack.streams.attachmentTable.detailsButtonAriaLabel', {
            defaultMessage: 'View details',
          })}
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Details clicked', attachment.id);
          }}
        />
      ),
    };

    const actionsColumn: EuiBasicTableColumn<Attachment> = {
      name: i18n.translate('xpack.streams.attachmentTable.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.streams.attachmentTable.seeDetailsActionTitle', {
            defaultMessage: 'See details',
          }),
          description: i18n.translate('xpack.streams.attachmentTable.seeDetailsActionDescription', {
            defaultMessage: 'See attachment details',
          }),
          type: 'icon',
          icon: 'tableDensityExpanded',
          onClick: (attachment) => {
            // eslint-disable-next-line no-console
            console.log('See details clicked', attachment.id);
          },
          'data-test-subj': 'streamsAppAttachmentSeeDetailsAction',
        },
        {
          name: (attachment) => {
            const config = ATTACHMENT_TYPE_CONFIG[attachment.type];
            return i18n.translate('xpack.streams.attachmentTable.goToActionTitle', {
              defaultMessage: 'Go to {type}',
              values: { type: config.label },
            });
          },
          description: i18n.translate('xpack.streams.attachmentTable.goToActionDescription', {
            defaultMessage: 'Navigate to attachment',
          }),
          type: 'icon',
          icon: (attachment) => ATTACHMENT_TYPE_CONFIG[attachment.type].icon,
          onClick: (attachment) => {
            const url = ATTACHMENT_URL_GETTERS[attachment.type](
              attachment.redirectId,
              share.url.locators,
              timeState.timeRange
            );
            if (url) {
              navigateToAttachment({ attachment, url });
            }
          },
          'data-test-subj': 'streamsAppAttachmentGoToAction',
        },
        {
          name: i18n.translate('xpack.streams.attachmentTable.unlinkActionTitle', {
            defaultMessage: 'Unlink attachment',
          }),
          description: i18n.translate('xpack.streams.attachmentTable.unlinkActionDescription', {
            defaultMessage: 'Unlink this attachment from stream',
          }),
          type: 'icon',
          icon: 'unlink',
          enabled: () => onUnlinkAttachment !== undefined,
          onClick: (attachment) => {
            onUnlinkAttachment?.(attachment);
          },
          'data-test-subj': 'streamsAppAttachmentUnlinkAction',
        },
      ],
    };

    return [
      ...(showActions ? [detailsColumn] : []),
      {
        field: 'label',
        name: i18n.translate('xpack.streams.attachmentTable.titleColumnTitle', {
          defaultMessage: 'Title',
        }),
        render: (_, attachment) => {
          const url = ATTACHMENT_URL_GETTERS[attachment.type](
            attachment.redirectId,
            share.url.locators,
            timeState.timeRange
          );

          if (!url) {
            return <EuiText size="s">{attachment.title}</EuiText>;
          }

          return (
            <EuiLink
              data-test-subj="streamsAppAttachmentColumnsLink"
              onClick={() => navigateToAttachment({ attachment, url })}
            >
              {attachment.title}
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
      ...(showActions ? [actionsColumn] : []),
    ];
  }, [
    compact,
    showActions,
    share,
    savedObjectsTaggingUi,
    timeState,
    onUnlinkAttachment,
    navigateToAttachment,
  ]);

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
