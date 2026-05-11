/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCode, EuiFlexGroup, EuiPageHeader, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { RedirectTo } from '../../../redirect_to';
import { RemoteStreamBadge } from '../../../stream_badges';
import { StreamDetailAttachments } from '../../../stream_detail_attachments';
import { StreamOverview } from '../../../stream_detail_overview';
import { StreamsAppPageTemplate } from '../../../streams_app_page_template';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import type { ManagementTabs } from './wrapper';

const remoteStreamManagementSubTabs = ['overview', 'significantEvents', 'attachments'] as const;

type RemoteStreamManagementSubTab = (typeof remoteStreamManagementSubTabs)[number];

function isValidManagementSubTab(
  value: string,
  overviewPageEnabled: boolean
): value is RemoteStreamManagementSubTab {
  if (value === 'overview' && !overviewPageEnabled) {
    return false;
  }
  return remoteStreamManagementSubTabs.includes(value as RemoteStreamManagementSubTab);
}

export function RemoteStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.RemoteStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const router = useStreamsAppRouter();
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');
  const { rangeFrom, rangeTo } = useTimeRange();
  const { euiTheme } = useEuiTheme();

  const {
    features: { overviewPage },
  } = useStreamsPrivileges();

  const { significantEvents } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  const tabs: ManagementTabs = {};

  if (overviewPage.enabled) {
    tabs.overview = {
      content: <StreamOverview />,
      label: i18n.translate('xpack.streams.remoteStreamDetailManagement.overviewTab', {
        defaultMessage: 'Overview',
      }),
    };
  }

  if (significantEvents) {
    tabs.significantEvents = significantEvents;
  }

  tabs.attachments = {
    content: <StreamDetailAttachments definition={definition} />,
    label: i18n.translate('xpack.streams.remoteStreamDetailManagement.attachmentsTab', {
      defaultMessage: 'Attachments',
    }),
  };

  const defaultTab = overviewPage.enabled ? 'overview' : 'significantEvents';

  if (!isValidManagementSubTab(tab, overviewPage.enabled) || !tabs[tab]?.content) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: defaultTab } }} />
    );
  }

  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {key}
            <RemoteStreamBadge />
          </EuiFlexGroup>
        }
        description={
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.remoteStreamDetailManagement.remoteIndexPatternLabel', {
              defaultMessage: 'Remote index pattern:',
            })}{' '}
            <EuiCode>{definition.stream.remote_index_pattern ?? definition.stream.name}</EuiCode>
          </EuiText>
        }
        tabs={Object.entries(tabs).map(([tabKey, { label }]) => ({
          label,
          href: router.link('/{key}/management/{tab}', {
            path: { key, tab: tabKey },
            query: { rangeFrom, rangeTo },
          }),
          isSelected: tab === tabKey,
          'data-test-subj': `remoteStreamDetails-${tabKey}-tab`,
        }))}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab].content}</StreamsAppPageTemplate.Body>
    </>
  );
}
