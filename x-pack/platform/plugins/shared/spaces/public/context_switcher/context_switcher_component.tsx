/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import {
  ContextSwitcher,
  type ContextSwitcherSpacesConfig,
} from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import {
  useActiveSpace,
  useEnvironmentContext,
  useManagementActions,
  useSpaceItems,
} from './hooks';
import { ENTER_SPACE_PATH } from '../../common';
import { SPACES_QUERY_KEY, useSpaces } from '../nav_control/hooks/use_spaces';
import type { SpacesManager } from '../spaces_manager';

interface ContextSwitcherComponentProps {
  spacesManager: SpacesManager;
  core: CoreStart;
  cloud?: CloudStart;
  isServerless?: boolean;
  allowSolutionVisibility: boolean;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, networkMode: 'always' },
  },
});

export const ContextSwitcherComponent = (props: ContextSwitcherComponentProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ContextSwitcherInner {...props} />
    </QueryClientProvider>
  );
};

const ContextSwitcherInner = ({
  spacesManager,
  core,
  cloud,
  isServerless,
  allowSolutionVisibility,
}: ContextSwitcherComponentProps) => {
  const { data: spaces, isLoading } = useSpaces(spacesManager);
  const activeSpace = useActiveSpace(spacesManager);

  const { spaceItems, activeSpaceItem } = useSpaceItems({
    spaces,
    activeSpace,
    isServerless,
    allowSolutionVisibility,
    serverlessProjectType: isServerless ? cloud?.serverless.projectType : undefined,
  });

  const environmentContext = useEnvironmentContext({
    cloud,
    http: core.http,
    isServerless,
  });

  const managementActions = useManagementActions({
    application: core.application,
    canManageSpaces: core.application.capabilities.spaces?.manage === true,
  });

  const handleSpaceSelect = useCallback(
    (spaceId: string) => {
      const url = addSpaceIdToPath(core.http.basePath.serverBasePath, spaceId, ENTER_SPACE_PATH);
      core.application.navigateToUrl(url);
    },
    [core]
  );

  const handleOpen = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY });
  }, []);

  const spacesConfig = useMemo((): ContextSwitcherSpacesConfig | undefined => {
    if (!activeSpaceItem) return undefined;
    return {
      active: activeSpaceItem,
      items: spaceItems,
      onSelect: handleSpaceSelect,
      ...managementActions,
      isLoading,
    };
  }, [activeSpaceItem, handleSpaceSelect, isLoading, managementActions, spaceItems]);

  if (!spacesConfig) return null;

  return (
    <ContextSwitcher
      spaces={spacesConfig}
      environmentContext={environmentContext}
      onOpen={handleOpen}
    />
  );
};
