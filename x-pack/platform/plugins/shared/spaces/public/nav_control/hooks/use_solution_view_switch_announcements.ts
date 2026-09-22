/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';

import type { Space } from '../../../common';
import {
  SOLUTION_VIEW_CONFIG,
  SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX,
} from '../../solution_view_switch';
import type { SupportedSolutionView } from '../../solution_view_switch';
import type { SolutionViewSwitchTourProps } from '../solution_view_switch_tour';
import { SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX } from '../solution_view_switch_tour';

const getTourAnchorSelector = (spaceId: string) =>
  `[data-test-subj="${spaceId}-selectableSpaceItem"] .euiBadge`;

const isSupportedSolutionView = (solution?: Space['solution']): solution is SupportedSolutionView =>
  Boolean(solution && Object.prototype.hasOwnProperty.call(SOLUTION_VIEW_CONFIG, solution));

interface StorageState {
  hasSwitchedFromClassic: boolean;
  hasSeenTour: boolean;
}

const getStorageState = (spaceId: string): StorageState => {
  try {
    return {
      hasSwitchedFromClassic:
        localStorage.getItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${spaceId}`) === 'true',
      hasSeenTour:
        localStorage.getItem(`${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${spaceId}`) ===
        'true',
    };
  } catch {
    return { hasSwitchedFromClassic: false, hasSeenTour: true };
  }
};

const markTourAsSeen = (spaceId: string): void => {
  try {
    localStorage.setItem(`${SOLUTION_VIEW_SWITCH_TOUR_STORAGE_KEY_PREFIX}:${spaceId}`, 'true');
  } catch {
    // ignore storage errors
  }
};

export interface UseSolutionViewSwitchAnnouncementsParams {
  activeSpace: Space | null;
  capabilities: Capabilities;
  areAnnouncementsEnabled: boolean;
  closeSpaceSelector: () => void;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export interface UseSolutionViewSwitchAnnouncementsResult {
  /** Whether to show the notification dot on the space avatar */
  showNotification: boolean;
  /** Props for the tour component, null if tour should not be shown */
  tourProps: SolutionViewSwitchTourProps | null;
}

export const useSolutionViewSwitchAnnouncements = ({
  activeSpace,
  capabilities,
  areAnnouncementsEnabled,
  closeSpaceSelector,
  navigateToApp,
}: UseSolutionViewSwitchAnnouncementsParams): UseSolutionViewSwitchAnnouncementsResult => {
  const canManageSpaces = Boolean(capabilities.spaces?.manage);
  const isAnnouncementEnabled = areAnnouncementsEnabled && canManageSpaces;

  const [storageState, setStorageState] = useState<StorageState>(() =>
    activeSpace
      ? getStorageState(activeSpace.id)
      : { hasSwitchedFromClassic: false, hasSeenTour: true }
  );

  useEffect(() => {
    if (activeSpace) {
      setStorageState(getStorageState(activeSpace.id));
    }
  }, [activeSpace]);

  const showNotification = useMemo(() => {
    if (!isAnnouncementEnabled || !activeSpace) return false;
    return storageState.hasSwitchedFromClassic && !storageState.hasSeenTour;
  }, [isAnnouncementEnabled, activeSpace, storageState]);

  const solution =
    activeSpace && isSupportedSolutionView(activeSpace.solution) ? activeSpace.solution : null;

  const onFinishTour = useCallback(() => {
    if (!activeSpace) return;

    setStorageState((prev) => ({ ...prev, hasSeenTour: true }));
    markTourAsSeen(activeSpace.id);
  }, [activeSpace]);

  const onClickSpaceSettings = useCallback(() => {
    if (!activeSpace) return;

    onFinishTour();
    closeSpaceSelector();
    navigateToApp('management', { path: `kibana/spaces/edit/${activeSpace.id}` });
  }, [activeSpace, closeSpaceSelector, navigateToApp, onFinishTour]);

  const tourProps: SolutionViewSwitchTourProps | null =
    solution && activeSpace && showNotification
      ? {
          anchor: getTourAnchorSelector(activeSpace.id),
          solution,
          onFinish: onFinishTour,
          onClickSpaceSettings,
        }
      : null;

  return { showNotification, tourProps };
};
