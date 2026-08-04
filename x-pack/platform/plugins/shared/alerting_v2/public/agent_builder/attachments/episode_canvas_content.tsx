/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeOverviewList } from '@kbn/alerting-v2-episodes-ui/components/details/overview_list';
import { AlertEpisodeSeverityBadge } from '@kbn/alerting-v2-episodes-ui/components/severity/episode_severity_badge';
import { AlertEpisodeStatusBadges } from '@kbn/alerting-v2-episodes-ui/components/status/status_badges';
import type {
  AlertEpisodeGroupAction,
  EpisodeActionState,
} from '@kbn/alerting-v2-episodes-ui/types/action';
import { EMPTY_VALUE } from '@kbn/alerting-v2-episodes-ui/constants';
import { formatDateTime } from '@kbn/alerting-v2-episodes-ui/utils/format_date_time';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { paths } from '../../constants';
import type { EpisodeAttachment } from './episode_attachment_definition';

export interface EpisodeCanvasContentProps
  extends AttachmentRenderProps<EpisodeAttachment>,
    CanvasRenderCallbacks {}

const buildEpisodeAction = (data: EpisodeAttachmentData): EpisodeActionState => ({
  episodeId: data['episode.id'],
  ruleId: data['rule.id'],
  groupHash: data.group_hash,
  lastAckAction: data.last_ack_action ?? null,
  lastAssigneeUid: data.last_assignee_uid ?? null,
  lastAckActor: null,
});

const buildGroupAction = (data: EpisodeAttachmentData): AlertEpisodeGroupAction => ({
  groupHash: data.group_hash,
  ruleId: data['rule.id'],
  lastDeactivateAction: null,
  lastSnoozeAction: data.last_snooze_action ?? null,
  snoozeExpiry: data.snooze_expiry ?? null,
  tags: data.last_tags ?? [],
  lastSnoozeActor: null,
  lastDeactivateActor: null,
});

export const EpisodeCanvasContent = ({
  attachment,
  registerActionButtons,
}: EpisodeCanvasContentProps) => {
  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const uiSettings = useService(CoreStart('uiSettings'));
  const userProfile = useService(CoreStart('userProfile'));
  const dateFormat = uiSettings.get<string>('dateFormat');

  const { data } = attachment;
  const episodeAction = useMemo(() => buildEpisodeAction(data), [data]);
  const groupAction = useMemo(() => buildGroupAction(data), [data]);

  useEffect(() => {
    registerActionButtons([
      {
        label: i18n.translate('xpack.alertingV2.episodeAttachment.viewInEpisodes', {
          defaultMessage: 'View in Episodes',
        }),
        icon: 'popout',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.alertEpisodeDetails(data['episode.id'])));
        },
      },
    ]);
  }, [application, basePath, data, registerActionButtons]);

  const identityItems = [
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.episodeId', {
        defaultMessage: 'Episode ID',
      }),
      description: data['episode.id'],
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.ruleId', {
        defaultMessage: 'Rule ID',
      }),
      description: data['rule.id'],
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.firstSeen', {
        defaultMessage: 'First seen',
      }),
      description: formatDateTime(data.first_timestamp, dateFormat) || EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.lastSeen', {
        defaultMessage: 'Last seen',
      }),
      description: formatDateTime(data.last_timestamp, dateFormat) || EMPTY_VALUE,
    },
  ];

  return (
    <EuiPanel paddingSize="l" hasShadow={false} data-test-subj="alertingV2EpisodeAttachmentCanvas">
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.alertingV2.episodeAttachment.canvas.title', {
                defaultMessage: 'Alert episode',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertEpisodeStatusBadges
            status={data['episode.status']}
            episodeAction={episodeAction}
            groupAction={groupAction}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertEpisodeSeverityBadge severity={data.severity} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiDescriptionList listItems={identityItems} type="column" compressed />

      <EuiSpacer size="m" />
      <AlertEpisodeOverviewList
        groupingFields={[]}
        groupingData={{}}
        groupingStatus="hidden"
        triggeredAt={data.triggered_at}
        durationMs={data.duration}
        assigneeUid={data.last_assignee_uid}
        episodeAction={episodeAction}
        groupAction={groupAction}
        userProfile={userProfile}
        dateFormat={dateFormat}
      />
    </EuiPanel>
  );
};
