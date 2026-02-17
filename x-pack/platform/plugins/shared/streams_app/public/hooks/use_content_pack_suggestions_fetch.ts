/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

/**
 * A dashboard from a content pack that matches a stream
 */
export interface ContentPackDashboard {
  id: string;
  title: string;
  packageName: string;
  packageTitle: string;
  packageVersion: string;
}

/**
 * Result of matching content packs to a stream
 */
export interface ContentPackSuggestion {
  streamName: string;
  dataset: string;
  dashboards: ContentPackDashboard[];
}

export const useContentPackSuggestionsFetch = ({ streamName }: { streamName: string }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const contentPackSuggestionsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/content_pack_suggestions',
        {
          signal,
          params: {
            path: {
              name: streamName,
            },
          },
        }
      );
      return response as ContentPackSuggestion;
    },
    [streamName, streamsRepositoryClient]
  );

  return contentPackSuggestionsFetch;
};
