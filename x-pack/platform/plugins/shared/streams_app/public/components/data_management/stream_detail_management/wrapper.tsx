/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeGroup, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { isUnwiredStreamDefinition } from '@kbn/streams-schema';
import { useStreamDetailAsIngestStream } from '../../../hooks/use_stream_detail';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../../stream_badges';

export type ManagementTabs = Record<
  string,
  {
    content: JSX.Element;
    label: string;
  }
>;

export function Wrapper({
  tabs,
  streamId,
  tab,
}: {
  tabs: ManagementTabs;
  streamId: string;
  tab: string;
}) {
  const router = useStreamsAppRouter();
  const { definition } = useStreamDetailAsIngestStream();

  const tabMap = Object.fromEntries(
    Object.entries(tabs).map(([tabName, currentTab]) => {
      return [
        tabName,
        {
          href: router.link('/{key}/management/{tab}', {
            path: { key: streamId, tab: tabName },
          }),
          label: currentTab.label,
          content: currentTab.content,
        },
      ];
    })
  );

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamTitle', {
              defaultMessage: 'Manage stream {streamId}',
              values: { streamId },
            })}
            <EuiBadgeGroup gutterSize="s">
              {isUnwiredStreamDefinition(definition.stream) && <ClassicStreamBadge />}
              <LifecycleBadge lifecycle={definition.effective_lifecycle} />
            </EuiBadgeGroup>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => {
          return {
            label,
            href,
            isSelected: tab === tabKey,
          };
        })}
      />
      <StreamsAppPageTemplate.Body>{tabs[tab].content}</StreamsAppPageTemplate.Body>
    </>
  );
}
