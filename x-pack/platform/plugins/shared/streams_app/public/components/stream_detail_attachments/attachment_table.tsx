/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type {
  Attachment,
  AttachmentType,
} from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';
import { useTimefilter } from '../../hooks/use_timefilter';

// TODO: They are both solution constants, how can I import them here?
const RULE_DETAILS_LOCATOR_ID = 'RULE_DETAILS_LOCATOR';
const SLO_DETAILS_LOCATOR_ID = 'SLO_DETAILS_LOCATOR';

const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  dashboard: i18n.translate('xpack.streams.attachmentTable.attachmentTypeDashboard', {
    defaultMessage: 'Dashboard',
  }),
  rule: i18n.translate('xpack.streams.attachmentTable.attachmentTypeRule', {
    defaultMessage: 'Rule',
  }),
  slo: i18n.translate('xpack.streams.attachmentTable.attachmentTypeSlo', {
    defaultMessage: 'SLO',
  }),
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
    const ruleLocator = locatorsService.get(RULE_DETAILS_LOCATOR_ID);
    return ruleLocator?.getRedirectUrl({ ruleId: redirectId }) || '';
  },
  slo: (redirectId, locatorsService) => {
    const sloLocator = locatorsService.get(SLO_DETAILS_LOCATOR_ID);
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

  const { timeState } = useTimefilter();

  const columns = useMemo((): Array<EuiBasicTableColumn<Attachment>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.attachmentTable.attachmentNameColumnTitle', {
          defaultMessage: 'Attachment name',
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
        name: i18n.translate('xpack.streams.attachmentTable.attachmentTypeColumnTitle', {
          defaultMessage: 'Attachment type',
        }),
        render: (type: AttachmentType) => {
          return ATTACHMENT_TYPE_LABELS[type];
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
