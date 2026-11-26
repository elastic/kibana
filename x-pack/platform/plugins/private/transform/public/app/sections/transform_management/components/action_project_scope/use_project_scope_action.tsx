/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type CPSProject, PROJECT_ROUTING, useFetchProjects } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import { TRANSFORM_PROJECT_ROUTING_MAX_LENGTH } from '../../../../../../common/constants';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import type { TransformListRow } from '../../../../common';
import { useTransformCapabilities, useUpdateTransformsProjectScope } from '../../../../hooks';
import { useGetTransformCpsEnabled } from '../../../../hooks/use_get_transform_cps_enabled';

import { isProjectScopeActionDisabled } from './project_scope_action_name';

const getEffectiveProjectRouting = (projectRouting?: ProjectRouting): NonNullable<ProjectRouting> =>
  projectRouting ?? PROJECT_ROUTING.ORIGIN;

const getInitialProjectRouting = (
  items: TransformListRow[],
  defaultProjectRouting: NonNullable<ProjectRouting>
): NonNullable<ProjectRouting> => {
  const [firstItem] = items;

  if (!firstItem) {
    return defaultProjectRouting;
  }

  const firstProjectRouting = getEffectiveProjectRouting(firstItem.config.source.project_routing);
  const hasSameProjectRouting = items.every(
    (item) => getEffectiveProjectRouting(item.config.source.project_routing) === firstProjectRouting
  );

  return hasSameProjectRouting ? firstProjectRouting : defaultProjectRouting;
};

interface UseProjectScopeActionArgs {
  onUpdateSuccess?: (submittedItems: TransformListRow[]) => void;
}

export type ProjectScopeAction = ReturnType<typeof useProjectScopeAction>;

const haveSameTransformIds = (
  firstItems: TransformListRow[],
  secondItems: TransformListRow[]
): boolean => {
  if (firstItems.length !== secondItems.length) {
    return false;
  }

  const secondItemIds = new Set(secondItems.map(({ id }) => id));
  return firstItems.every(({ id }) => secondItemIds.has(id));
};

export const useProjectScopeAction = ({ onUpdateSuccess }: UseProjectScopeActionArgs = {}) => {
  const { cps } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const cpsManager = cps?.cpsManager;
  const { canCreateTransform } = useTransformCapabilities();
  const updateTransformsProjectScope = useUpdateTransformsProjectScope();
  const canCheckProjectScope = Boolean(cps?.isTierEligible && cpsManager);
  const { data: isTransformCpsEnabled } = useGetTransformCpsEnabled({
    enabled: canCheckProjectScope,
  });
  const defaultProjectRoutingGetter = useCallback(
    () => cpsManager?.getDefaultProjectRouting() ?? PROJECT_ROUTING.ALL,
    [cpsManager]
  );
  const defaultProjectRouting = defaultProjectRoutingGetter();
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);
  const [targetProjectRouting, setTargetProjectRouting] =
    useState<NonNullable<ProjectRouting>>(defaultProjectRouting);
  const fetchProjectsByRouting = useCallback(
    (routing?: ProjectRouting) => cpsManager?.fetchProjects(routing) ?? Promise.resolve(null),
    [cpsManager]
  );
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) =>
      fetchProjectsByRouting(routing).then(
        (projects) => projects ?? { origin: null, linkedProjects: [] }
      ),
    [fetchProjectsByRouting]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    PROJECT_ROUTING.ALL
  );
  const availableProjects = useMemo<CPSProject[]>(
    () => (originProject ? [originProject, ...linkedProjects] : linkedProjects),
    [linkedProjects, originProject]
  );
  const isCpsEnabled = Boolean(canCheckProjectScope && isTransformCpsEnabled === true && !error);
  const hasLinkedProjects = linkedProjects.length > 0;
  const isLoadingProjectScope = isLoading;
  const hasChanges = items.some(
    (item) =>
      getEffectiveProjectRouting(item.config.source.project_routing) !== targetProjectRouting
  );

  const isDisabled = useCallback(
    (newItems: TransformListRow[]) =>
      isProjectScopeActionDisabled({
        canCreateTransform,
        hasLinkedProjects,
        isCpsEnabled,
        isLoading: isLoadingProjectScope,
        items: newItems,
      }),
    [canCreateTransform, hasLinkedProjects, isCpsEnabled, isLoadingProjectScope]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutVisible(false);
    setModalVisible(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const openFlyout = useCallback(
    (newItems: TransformListRow[]) => {
      if (isDisabled(newItems)) {
        return;
      }

      setItems(newItems);
      setTargetProjectRouting(getInitialProjectRouting(newItems, defaultProjectRouting));
      setFlyoutVisible(true);
      setModalVisible(false);
    },
    [defaultProjectRouting, isDisabled]
  );

  const openModal = useCallback(
    (projectRouting: NonNullable<ProjectRouting>) => {
      if (projectRouting.length > TRANSFORM_PROJECT_ROUTING_MAX_LENGTH) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.transform.transformList.projectScopeRoutingTooLargeToastTitle',
            {
              defaultMessage: 'Project scope is too large to save',
            }
          ),
          text: i18n.translate(
            'xpack.transform.transformList.projectScopeRoutingTooLargeToastText',
            {
              defaultMessage:
                'Reduce the number of selected projects or adjust the project filters and try again.',
            }
          ),
        });
        return;
      }

      setTargetProjectRouting(projectRouting);
      setModalVisible(true);
    },
    [toastNotifications]
  );

  const onProjectRoutingChange = useCallback((projectRouting: ProjectRouting) => {
    if (projectRouting !== undefined) {
      setTargetProjectRouting(projectRouting);
    }
  }, []);

  const confirmAndCloseModal = useCallback(() => {
    if (targetProjectRouting === undefined) {
      return;
    }

    const submittedItems = items;
    updateTransformsProjectScope(
      {
        projectRouting: targetProjectRouting,
        transformsInfo: submittedItems.map(({ id }) => ({ id })),
      },
      {
        onSuccess: (results) => {
          const didAllTransformsUpdate = Object.values(results).every((result) => result.success);

          if (didAllTransformsUpdate) {
            setItems((currentItems) =>
              haveSameTransformIds(currentItems, submittedItems) ? [] : currentItems
            );
            onUpdateSuccess?.(submittedItems);
          }
        },
      }
    );
    setModalVisible(false);
    setFlyoutVisible(false);
  }, [items, onUpdateSuccess, targetProjectRouting, updateTransformsProjectScope]);

  return {
    availableProjects,
    canCreateTransform,
    closeFlyout,
    closeModal,
    confirmAndCloseModal,
    defaultProjectRouting,
    defaultProjectRoutingGetter,
    fetchProjectsByRouting,
    hasChanges,
    hasLinkedProjects,
    isCpsEnabled,
    isDisabled,
    isFlyoutVisible,
    isLoading: isLoadingProjectScope,
    isModalVisible,
    items,
    onProjectRoutingChange,
    openFlyout,
    openModal,
    originProjectId: originProject?._id,
    targetProjectRouting,
  };
};
