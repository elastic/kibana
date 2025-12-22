/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export const useStreamFeatures = (definition: Streams.all.Definition) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const { value, loading, error, refresh } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/systems', {
        signal,
        params: {
          path: {
            name: definition.name,
          },
        },
      });
    },
    [definition.name, streamsRepositoryClient]
  );

  const systems = useMemo(() => value?.systems ?? [], [value?.systems]);

  const featuresByName = useMemo(
    () => Object.fromEntries(systems.map((s) => [s.name, s])),
    [systems]
  );

  return {
    refreshFeatures: refresh,
    features: systems,
    featuresByName,
    featuresLoading: loading,
    error,
  };
};
