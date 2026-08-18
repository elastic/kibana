/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type CPSProject, PROJECT_ROUTING, useFetchProjects } from '@kbn/cps-utils';

import { useAppDependencies } from '../../../../app_dependencies';
import type { TransformListRow } from '../../../../common';
import { useTransformCapabilities, useUpdateTransformsProjectScope } from '../../../../hooks';

import { isProjectScopeActionDisabled } from './project_scope_action_name';

const getEffectiveProjectRouting = (projectRouting?: ProjectRouting): ProjectRouting =>
  projectRouting ?? PROJECT_ROUTING.ORIGIN;

export type ProjectScopeAction = ReturnType<typeof useProjectScopeAction>;

export const useProjectScopeAction = () => {
  const { cps } = useAppDependencies();
  const cpsManager = cps?.cpsManager;
  const { canCreateTransform } = useTransformCapabilities();
  const updateTransformsProjectScope = useUpdateTransformsProjectScope();
  const defaultProjectRouting = cpsManager?.getDefaultProjectRouting() ?? PROJECT_ROUTING.ALL;
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);
  const [targetProjectRouting, setTargetProjectRouting] =
    useState<NonNullable<ProjectRouting>>(defaultProjectRouting);
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) =>
      cpsManager?.fetchProjects(routing) ?? Promise.resolve({ origin: null, linkedProjects: [] }),
    [cpsManager]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    PROJECT_ROUTING.ALL
  );
  const availableProjects = useMemo<CPSProject[]>(
    () => (originProject ? [originProject, ...linkedProjects] : linkedProjects),
    [linkedProjects, originProject]
  );
  const isCpsEnabled = Boolean(cps?.isTierEligible && cpsManager && !error);
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
      setTargetProjectRouting(defaultProjectRouting);
      setFlyoutVisible(true);
      setModalVisible(false);
    },
    [defaultProjectRouting, isDisabled]
  );

  const openModal = useCallback(() => {
    if (!hasChanges) {
      return;
    }

    setModalVisible(true);
  }, [hasChanges]);

  const onProjectRoutingChange = useCallback((projectRouting: ProjectRouting) => {
    if (projectRouting !== undefined) {
      setTargetProjectRouting(projectRouting);
    }
  }, []);

  const confirmAndCloseModal = useCallback(() => {
    updateTransformsProjectScope({
      projectRouting: targetProjectRouting,
      transformsInfo: items.map(({ id }) => ({ id })),
    });
    setModalVisible(false);
    setFlyoutVisible(false);
  }, [items, targetProjectRouting, updateTransformsProjectScope]);

  return {
    availableProjects,
    canCreateTransform,
    closeFlyout,
    closeModal,
    confirmAndCloseModal,
    defaultProjectRouting,
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
