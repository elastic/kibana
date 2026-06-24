/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { QueryClientProvider } from '@kbn/react-query';
import type { QueryClient } from '@kbn/react-query';
import { map, of } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ActiveSpaceProvider } from './active_space_context';

interface ActiveSpaceSyncProps {
  spaces?: SpacesPluginStart;
  queryClient: QueryClient;
  children: React.ReactNode;
}

/**
 * Keeps ActiveSpaceProvider in sync when the user switches Kibana spaces.
 * Remounts the query cache when the active space changes.
 */
export const ActiveSpaceSync: React.FC<ActiveSpaceSyncProps> = ({
  spaces,
  queryClient,
  children,
}) => {
  const spaceId = useObservable(
    spaces?.getActiveSpace$().pipe(map((space) => space.id)) ?? of(DEFAULT_SPACE_ID),
    DEFAULT_SPACE_ID
  );

  return (
    <ActiveSpaceProvider spaceId={spaceId}>
      <QueryClientProvider client={queryClient} key={spaceId}>
        {children}
      </QueryClientProvider>
    </ActiveSpaceProvider>
  );
};
