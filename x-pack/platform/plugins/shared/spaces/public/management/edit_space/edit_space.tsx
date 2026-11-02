/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

import {
  AppHeader,
  type AppHeaderBadge,
  type AppHeaderMenu,
  type AppHeaderTab,
} from '@kbn/app-header';
import type { ScopedHistory } from '@kbn/core/public';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_GENERAL, TAB_ID_ROLES } from './constants';
import { handleApiError } from './handle_api_error';
import { useTabs } from './hooks/use_tabs';
import { useEditSpaceServices, useEditSpaceStore } from './provider';
import { ENTER_SPACE_PATH, type Space } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';
import { getSpaceSolutionBadgeLabel, SpaceSolutionBadge } from '../../space_solution_badge';

const spacesListTitle = i18n.translate('xpack.spaces.management.spacesGridPage.spacesTitle', {
  defaultMessage: 'Spaces',
});

const editSpaceFallbackTitle = i18n.translate(
  'xpack.spaces.management.spaceDetails.editSpaceTitle',
  { defaultMessage: 'Edit space' }
);

const switchToSpaceButtonLabel = i18n.translate(
  'xpack.spaces.management.spaceDetails.space.switchToSpaceButton.label',
  { defaultMessage: 'Switch to this space' }
);

const currentSpaceBadgeLabel = i18n.translate(
  'xpack.spaces.management.spaceDetails.space.badge.isCurrent',
  { defaultMessage: 'Current' }
);

const getSelectedTabId = (canUserViewRoles: boolean, selectedTabId?: string) => {
  // Validation of the selectedTabId routing parameter, default to the Content tab
  return selectedTabId &&
    [TAB_ID_CONTENT, canUserViewRoles ? TAB_ID_ROLES : null].filter(Boolean).includes(selectedTabId)
    ? selectedTabId
    : TAB_ID_GENERAL;
};

interface PageProps {
  spaceId?: string;
  history: ScopedHistory;
  selectedTabId?: string;
  getFeatures: FeaturesPluginStart['getFeatures'];
  onLoadSpace: (space: Space) => void;
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
}

export const EditSpace: FC<PageProps> = ({
  spaceId,
  getFeatures,
  history,
  onLoadSpace,
  selectedTabId: _selectedTabId,
  ...props
}) => {
  const { state, dispatch } = useEditSpaceStore();
  const { invokeClient } = useEditSpaceServices();
  const {
    spacesManager,
    capabilities,
    serverBasePath,
    logger,
    notifications,
    isRoleManagementEnabled,
    license,
    enableSecurityLink,
  } = useEditSpaceServices();
  const [space, setSpace] = useState<Space | null>(null);
  const [userActiveSpace, setUserActiveSpace] = useState<Space | null>(null);
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  const [isLoadingSpace, setIsLoadingSpace] = useState(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const selectedTabId = getSelectedTabId(Boolean(capabilities?.roles?.view), _selectedTabId);
  const isSecurityEnabled = Boolean(license?.isEnabled());
  const rolesLoadedForSpaceRef = useRef<string | null>(null);
  const [tabs, selectedTabContent] = useTabs({
    space,
    features,
    isRoleManagementEnabled,
    capabilities,
    history,
    currentSelectedTabId: selectedTabId,
    isSecurityEnabled,
    enableSecurityLink,
    ...props,
  });

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getSpaceInfo = async () => {
      // active space: the space that is active in the user's session
      // current space: the space being edited by the user
      const [activeSpace, currentSpace] = await Promise.all([
        spacesManager.getActiveSpace(),
        spacesManager.getSpace(spaceId),
      ]);

      setSpace(currentSpace);
      setUserActiveSpace(activeSpace);
      setIsLoadingSpace(false);
    };

    getSpaceInfo().catch((error) =>
      handleApiError(error, { logger, toasts: notifications.toasts })
    );
  }, [spaceId, spacesManager, logger, notifications.toasts]);

  // Load roles to show the count of assigned roles as a badge in the "Assigned roles" tab title
  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getRoles = async () => {
      await invokeClient(async (clients) => {
        let result: Role[] = [];
        try {
          result = await clients.spacesManager.getRolesForSpace(spaceId);
        } catch (error) {
          const message = error?.body?.message ?? error.toString();
          const statusCode = error?.body?.statusCode ?? null;
          if (statusCode === 403) {
            logger.error('Insufficient permissions to get list of roles for the space');
            logger.error(message);
          } else {
            logger.error('Encountered error while getting list of roles for space!');
            logger.error(error);
          }
          dispatch({ type: 'fetch_roles_error', payload: true });
        }
        dispatch({ type: 'update_roles', payload: result });
      });

      setIsLoadingRoles(false);
      rolesLoadedForSpaceRef.current = spaceId;
    };

    const shouldLoadRoles =
      isRoleManagementEnabled &&
      rolesLoadedForSpaceRef.current !== spaceId &&
      !state.fetchRolesError;

    if (shouldLoadRoles) {
      getRoles();
    }
  }, [dispatch, invokeClient, spaceId, logger, state.fetchRolesError, isRoleManagementEnabled]);

  useEffect(() => {
    const _getFeatures = async () => {
      const result = await getFeatures();
      setFeatures(result);
      setIsLoadingFeatures(false);
    };
    _getFeatures().catch((error) =>
      handleApiError(error, { logger, toasts: notifications.toasts })
    );
  }, [getFeatures, logger, notifications.toasts]);

  useEffect(() => {
    if (space) {
      onLoadSpace?.(space);
    }
  }, [onLoadSpace, space]);

  const isPageReady =
    Boolean(space) &&
    !isLoadingSpace &&
    !isLoadingFeatures &&
    (!isRoleManagementEnabled || !isLoadingRoles);

  const title = space?.name ?? editSpaceFallbackTitle;
  const solution = space?.solution ?? SOLUTION_VIEW_CLASSIC;
  const shouldShowSolutionBadge =
    Boolean(space) && (props.allowSolutionVisibility || solution !== SOLUTION_VIEW_CLASSIC);
  const isCurrentSpace = Boolean(space && userActiveSpace?.id === space.id);
  const switchHref = space
    ? addSpaceIdToPath(
        serverBasePath,
        space.id,
        `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/edit/${space.id}`
      )
    : undefined;

  const badges: AppHeaderBadge[] = [];
  if (shouldShowSolutionBadge) {
    badges.push({
      label: getSpaceSolutionBadgeLabel(solution),
      renderCustomBadge: () => (
        <SpaceSolutionBadge
          solution={solution}
          data-test-subj={`space-solution-badge-${solution}`}
        />
      ),
    });
  }
  if (isCurrentSpace) {
    badges.push({
      label: currentSpaceBadgeLabel,
      color: 'primary',
      'data-test-subj': 'space-current-badge',
    });
  }

  const headerTabs: AppHeaderTab[] | undefined =
    space && isPageReady
      ? tabs.map((tab) => {
          const pathname = `/edit/${encodeURIComponent(space.id)}/${tab.id}`;
          return {
            id: tab.id,
            label: tab.name,
            isSelected: tab.id === selectedTabId,
            href: history.createHref({ pathname }),
            onClick: () => history.push(pathname),
            badge: tab.id === TAB_ID_ROLES ? state.roles.size : undefined,
          };
        })
      : undefined;

  const menu: AppHeaderMenu | undefined =
    space && !isCurrentSpace && switchHref
      ? {
          primaryActionItem: {
            id: 'switchSpace',
            label: switchToSpaceButtonLabel,
            iconType: 'merge',
            testId: 'spaces-view-page-switcher-button',
            href: switchHref,
          },
        }
      : undefined;

  return (
    <div data-test-subj={space ? 'spaces-view-page' : undefined}>
      <div data-test-subj={space ? 'space-view-page-details-header' : undefined}>
        <AppHeader
          title={title}
          description={space?.description || undefined}
          badges={badges.length ? badges : undefined}
          tabs={headerTabs}
          menu={menu}
          back={{
            href: history.createHref({ pathname: '/' }),
            label: spacesListTitle,
          }}
          spacing="bleed"
        />
      </div>
      <EuiSpacer size="l" />
      {!isPageReady ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xxl" data-test-subj="editSpacePageLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        selectedTabContent ?? null
      )}
    </div>
  );
};
