/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ContentFrameworkSection } from '@kbn/unified-doc-viewer-plugin/public';
import type { StreamsAppLocator } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';
import { StreamLinkContent } from './stream_link_content';

export interface DiscoverFlyoutStreamFieldByStreamNameProps {
  streamName: string;
  streamsRepositoryClient: StreamsRepositoryClient;
  locator: StreamsAppLocator;
  renderCpsWarning?: boolean;
}

export function DiscoverFlyoutStreamFieldByStreamName(
  props: DiscoverFlyoutStreamFieldByStreamNameProps
) {
  return (
    <ContentFrameworkSection
      id="discoverFlyoutStreamFieldByStreamName"
      title={i18n.translate('xpack.streams.discoverFlyoutStreamFieldByStreamName.title', {
        defaultMessage: 'Stream',
      })}
    >
      <DiscoverFlyoutStreamFieldByStreamNameContent {...props} />
    </ContentFrameworkSection>
  );
}

function DiscoverFlyoutStreamFieldByStreamNameContent({
  streamName,
  streamsRepositoryClient,
  locator,
  renderCpsWarning,
}: DiscoverFlyoutStreamFieldByStreamNameProps) {
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    fallbackStreamName: streamName,
    cpsHasLinkedProjects: renderCpsWarning,
  });

  return (
    <StreamLinkContent
      name={value?.name}
      existsLocally={value?.existsLocally}
      loading={loading}
      error={error}
      locator={locator}
      renderCpsWarning={renderCpsWarning}
    />
  );
}
