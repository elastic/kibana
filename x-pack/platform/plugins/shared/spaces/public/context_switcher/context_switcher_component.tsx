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
  type ContextSwitcherVariant,
  type LinksListItem,
  ProjectMenu,
} from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import {
  useActiveSpace,
  useEnvironmentContext,
  useFooterLinks,
  useManagementActions,
  useSpaceItems,
} from './hooks';
import { useProjectPreview } from './project_preview';
import { ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../common';
import { SPACES_QUERY_KEY, useSpaces } from '../nav_control/hooks/use_spaces';
import type { SpacesManager } from '../spaces_manager';

const MANAGE_LABEL = i18n.translate('xpack.spaces.contextSwitcher.manage', {
  defaultMessage: 'Manage',
});

export interface ContextSwitcherComponentProps {
  spacesManager: SpacesManager;
  core: CoreStart;
  cloud?: CloudStart;
  isServerless?: boolean;
  allowSolutionVisibility: boolean;
  variant?: ContextSwitcherVariant;
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
  variant = 'proposal1',
}: ContextSwitcherComponentProps) => {
  const projectPreview = useProjectPreview();
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

  const footerLinks = useFooterLinks({
    application: core.application,
    cloud,
    isServerless,
    activeSpaceSolution: activeSpace?.solution,
  });

  const managementActions = useManagementActions({
    application: core.application,
    canManageSpaces: core.application.capabilities.spaces?.manage === true,
  });

  const handleSpaceSelect = useCallback<ContextSwitcherSpacesConfig['onSelect']>(
    (spaceId, event) => {
      const url = addSpaceIdToPath(core.http.basePath.serverBasePath, spaceId, ENTER_SPACE_PATH);

      if (event.shiftKey) {
        window.open(url);
      } else if (event.ctrlKey || event.metaKey) {
        window.open(url, '_blank');
      } else {
        core.application.navigateToUrl(url);
      }
    },
    [core]
  );

  const handleOpen = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY });
  }, []);

  const spacesConfig = useMemo((): ContextSwitcherSpacesConfig | undefined => {
    if (!activeSpaceItem) return undefined;
    const headerAction =
      variant === 'original' && managementActions.headerAction
        ? { ...managementActions.headerAction, label: MANAGE_LABEL }
        : managementActions.headerAction;
    return {
      active: activeSpaceItem,
      items: spaceItems,
      onSelect: handleSpaceSelect,
      headerAction,
      footerAction: managementActions.footerAction,
      search: { threshold: SPACE_SEARCH_COUNT_THRESHOLD },
      isLoading,
    };
  }, [activeSpaceItem, handleSpaceSelect, isLoading, managementActions, spaceItems, variant]);

  if (!spacesConfig) return null;

  if (variant === 'original') {
    return (
      <ContextSwitcher
        variant="original"
        spaces={spacesConfig}
        environmentContext={environmentContext}
        footerLinks={footerLinks}
        onOpen={handleOpen}
      />
    );
  }

  if (variant === 'proposal2') {
    return (
      <ContextSwitcher
        variant="proposal2"
        spaces={spacesConfig}
        footerLinks={footerLinks}
        projectSummary={{
          icon: projectPreview.icon,
          name: projectPreview.name,
          description: projectPreview.description,
          href: cloud?.deploymentUrl || undefined,
        }}
        onOpen={handleOpen}
      />
    );
  }

  return <ContextSwitcher spaces={spacesConfig} onOpen={handleOpen} />;
};

export const ProjectMenuComponent = (props: ContextSwitcherComponentProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectMenuInner {...props} />
    </QueryClientProvider>
  );
};

const ProjectMenuInner = ({
  spacesManager,
  core,
  cloud,
  isServerless,
  allowSolutionVisibility,
}: ContextSwitcherComponentProps) => {
  const { data: spaces } = useSpaces(spacesManager);
  const activeSpace = useActiveSpace(spacesManager);
  const { activeSpaceItem } = useSpaceItems({
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
  const footerLinks = useFooterLinks({
    application: core.application,
    cloud,
    isServerless,
    activeSpaceSolution: activeSpace?.solution,
  });

  if (!environmentContext || !activeSpaceItem) return null;

  const solution = activeSpaceItem.solution;
  let description = i18n.translate(
    'xpack.spaces.contextSwitcher.projectMenu.projectDescriptionFallback',
    { defaultMessage: 'Project' }
  );
  if (environmentContext.environmentType === 'deployment') {
    description = i18n.translate('xpack.spaces.contextSwitcher.projectMenu.deploymentDescription', {
      defaultMessage: 'Deployment',
    });
  } else if (solution) {
    description = i18n.translate('xpack.spaces.contextSwitcher.projectMenu.projectDescription', {
      defaultMessage: '{solution} project',
      values: { solution },
    });
  }

  const createAction = environmentContext.submenuFooterAction;
  const actions: LinksListItem[] = [
    ...environmentContext.submenuItems,
    ...(createAction
      ? [
          {
            id: createAction.id,
            label: createAction.label,
            href: createAction.href,
            onClick: createAction.onClick,
            iconType: 'plus' as const,
            'data-test-subj': createAction['data-test-subj'],
          },
        ]
      : []),
  ];

  return (
    <ProjectMenu
      icon={activeSpaceItem.solutionIcon ?? 'logoElastic'}
      name={environmentContext.name}
      description={description}
      actions={actions}
      footerLinks={footerLinks}
    />
  );
};
