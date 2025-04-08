/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiButton, EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { IngestStreamGetResponse, isUnwiredStreamDefinition } from '@kbn/streams-schema';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../stream_badges';

export interface EntityViewTab {
  name: string;
  label: string;
  content: React.ReactElement;
  background: boolean;
}

export function EntityDetailViewWithoutParams({
  selectedTab,
  tabs,
  entity,
  definition,
}: {
  selectedTab: string;
  tabs: EntityViewTab[];
  entity: {
    displayName?: string;
    id: string;
  };
  definition: IngestStreamGetResponse;
}) {
  const router = useStreamsAppRouter();

  useStreamsAppBreadcrumbs(() => {
    if (!entity.displayName) {
      return [];
    }

    return [
      {
        title: entity.displayName,
        path: `/{key}`,
        params: { path: { key: entity.id } },
      } as const,
    ];
  }, [entity.displayName, entity.id]);

  if (!entity.displayName) {
    return <LoadingPanel />;
  }

  const tabMap = Object.fromEntries(
    tabs.map((tab) => {
      return [
        tab.name,
        {
          href: router.link('/{key}/{tab}', {
            path: { key: entity.id, tab: tab.name },
          }),
          label: tab.label,
          content: tab.content,
          background: tab.background,
        },
      ];
    })
  );

  const selectedTabObject = tabMap[selectedTab];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {entity.displayName}
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
            isSelected: selectedTab === tabKey,
          };
        })}
        rightSideItems={[
          <EuiButton
            iconType="gear"
            href={router.link('/{key}/management/{tab}', {
              path: { key: entity.id, tab: 'route' },
            })}
          >
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamLabel', {
              defaultMessage: 'Manage stream',
            })}
          </EuiButton>,
        ]}
      />
      <StreamsAppPageTemplate.Body color={selectedTabObject.background ? 'plain' : 'subdued'}>
        {selectedTabObject.content}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
