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
import { useQueryClient } from '@kbn/react-query';

import { useActiveSpace } from './hooks/use_active_space';
import { useEnvironmentContext } from './hooks/use_environment_context';
import { useManagementActions } from './hooks/use_management_actions';
import { useSpaceItems } from './hooks/use_space_items';
import { addSpaceIdToPath, ENTER_SPACE_PATH } from '../../common';
import { SPACES_QUERY_KEY, useSpaces } from '../nav_control/hooks/use_spaces';
import type { SpacesManager } from '../spaces_manager';

interface ContextSwitcherComponentProps {
  spacesManager: SpacesManager;
  core: CoreStart;
  cloud?: CloudStart;
  isServerless?: boolean;
  allowSolutionVisibility: boolean;
}

export const ContextSwitcherComponent = ({
  spacesManager,
  core,
  cloud,
  isServerless,
  allowSolutionVisibility,
}: ContextSwitcherComponentProps) => {
  const queryClient = useQueryClient();

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
  }, [queryClient]);

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
