/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPageHeader, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { QueryStreamSchemaEditor } from '../../../query_streams/query_stream_schema_editor';
import { QueryStreamsAdvancedView } from '../../../query_streams/query_streams_advanced_view';
import { RedirectTo } from '../../../redirect_to';
import { DiscoverBadgeButton, QueryStreamBadge } from '../../../stream_badges';
import { StreamDetailAttachments } from '../../../stream_detail_attachments';
import { StreamOverview } from '../../../stream_detail_overview';
import { StreamsAppPageTemplate } from '../../../streams_app_page_template';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import type { ManagementTabs } from './wrapper';
import { QueryStreamPartitioning } from '../stream_detail_routing/query_stream_partitioning';

const queryStreamManagementSubTabs = [
  'overview',
  'partitioning',
  'advanced',
  'schema',
  'significantEvents',
  'attachments',
] as const;

type QueryStreamManagementSubTab = (typeof queryStreamManagementSubTabs)[number];

function isValidManagementSubTab(
  value: string,
  overviewPageEnabled: boolean
): value is QueryStreamManagementSubTab {
  if (value === 'overview' && !overviewPageEnabled) {
    return false;
  }
  return queryStreamManagementSubTabs.includes(value as QueryStreamManagementSubTab);
}

export function QueryStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.QueryStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const router = useStreamsAppRouter();
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');
  const { rangeFrom, rangeTo } = useTimeRange();

  const {
    features: { attachments, overviewPage },
  } = useStreamsPrivileges();

  const { euiTheme } = useEuiTheme();

  const { significantEvents } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  const tabs: ManagementTabs = {};

  if (overviewPage.enabled) {
    tabs.overview = {
      content: <StreamOverview />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    };
  }

  tabs.partitioning = {
    content: (
      <QueryStreamPartitioning definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.partitioningTab', {
      defaultMessage: 'Partitioning',
    }),
  };

  tabs.schema = {
    content: (
      <QueryStreamSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
      defaultMessage: 'Schema',
    }),
  };

  if (attachments?.enabled) {
    tabs.attachments = {
      content: <StreamDetailAttachments definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
        defaultMessage: 'Attachments',
      }),
    };
  }

  if (significantEvents) {
    tabs.significantEvents = significantEvents;
  }

  tabs.advanced = {
    content: (
      <QueryStreamsAdvancedView definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: (
      <EuiToolTip
        content={i18n.translate('xpack.streams.queryStreamDetailManagement.advanced.tooltip', {
          defaultMessage: 'View technical details about this query stream’s underlying setup',
        })}
      >
        <span tabIndex={0}>
          {i18n.translate('xpack.streams.queryStreamDetailManagement.advancedTab', {
            defaultMessage: 'Advanced',
          })}
        </span>
      </EuiToolTip>
    ),
  };

  const defaultTab = overviewPage.enabled ? 'overview' : 'partitioning';

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
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {key}
              <QueryStreamBadge />
            </EuiFlexGroup>
            <DiscoverBadgeButton stream={definition.stream} hasDataStream spellOut />
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabs).map(([tabKey, { label }]) => ({
          label,
          href: router.link('/{key}/management/{tab}', {
            path: { key, tab: tabKey },
            query: { rangeFrom, rangeTo },
          }),
          isSelected: tab === tabKey,
          'data-test-subj': `queryStreamDetails-${tabKey}-tab`,
        }))}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab].content}</StreamsAppPageTemplate.Body>
    </>
  );
}
