/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import React from 'react';
import type { StreamsAppLocator } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';
import { REMOTE_SEARCH_TYPE, StreamLinkContent } from './stream_link_content';

export interface DiscoverFlyoutStreamFieldByStreamNameProps {
  streamName: string;
  streamsRepositoryClient: StreamsRepositoryClient;
  locator: StreamsAppLocator;
  cpsHasLinkedProjects?: boolean;
}

export function DiscoverFlyoutStreamFieldByStreamName({
  streamName,
  streamsRepositoryClient,
  locator,
  cpsHasLinkedProjects,
}: DiscoverFlyoutStreamFieldByStreamNameProps) {
  const remoteSource = parseRemoteStreamName(streamName);

  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    fallbackStreamName: remoteSource?.streamName ?? streamName,
    cpsHasLinkedProjects: remoteSource ? undefined : cpsHasLinkedProjects,
  });

  if (remoteSource) {
    return (
      <StreamLinkContent
        name={remoteSource.streamName}
        existsLocally={false}
        loading={false}
        error={undefined}
        locator={locator}
        remoteSearchType={cpsHasLinkedProjects ? REMOTE_SEARCH_TYPE.CPS : REMOTE_SEARCH_TYPE.CCS}
        remoteName={remoteSource.remoteName}
      />
    );
  }

  return (
    <StreamLinkContent
      name={value?.name}
      existsLocally={value?.existsLocally}
      loading={loading}
      error={error}
      locator={locator}
    />
  );
}

/**
 * Splits a cross-cluster search (CCS) qualified name of the form
 * `<remoteCluster>:<streamName>` into its parts. Returns `undefined` for local
 * names so the caller falls back to normal local resolution.
 */
function parseRemoteStreamName(
  name: string
): { remoteName: string; streamName: string } | undefined {
  if (!isNonLocalIndexName(name)) {
    return undefined;
  }
  const colonIdx = name.indexOf(':');
  return {
    remoteName: name.substring(0, colonIdx),
    streamName: name.substring(colonIdx + 1),
  };
}
