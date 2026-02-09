/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import type { ManagementTabs } from './wrapper';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { DiscoverBadgeButton, QueryStreamBadge } from '../../stream_badges';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailAttachments } from '../../stream_detail_attachments';
import { RedirectTo } from '../../redirect_to';
import { QueryStreamSchemaEditor } from '../../query_streams/query_stream_schema_editor';
import { QueryStreamsAdvancedView } from '../../query_streams/query_streams_advanced_view';
import { FeedbackButton } from '../../feedback_button';

const queryStreamManagementSubTabs = [
  'overview',
  'advanced',
  'schema',
  'significantEvents',
  'attachments',
] as const;

type QueryStreamManagementSubTab = (typeof queryStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is QueryStreamManagementSubTab {
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

  const {
    features: { attachments },
  } = useStreamsPrivileges();

  const { isLoading, significantEvents } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  if (isLoading) {
    return null;
  }

  const tabs: ManagementTabs = {};

  tabs.overview = {
    content: <div />, // TODO: Implement overview tab
    label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
      defaultMessage: 'Overview',
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

  if (!isValidManagementSubTab(tab) || !tabs[tab]?.content) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />
    );
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        paddingSize="l"
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {key}
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <QueryStreamBadge />
              <EuiFlexItem grow />
              <DiscoverBadgeButton stream={definition.stream} hasDataStream spellOut />
              <FeedbackButton />
            </EuiFlexGroup>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabs).map(([tabKey, { label }]) => ({
          label,
          href: router.link('/{key}/management/{tab}', {
            path: { key, tab: tabKey },
          }),
          isSelected: tab === tabKey,
        }))}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab].content}</StreamsAppPageTemplate.Body>
    </>
  );
}
