/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, first, firstValueFrom, map } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';

import {
  DEFAULT_SPACE_ID,
  SHOW_SPACE_SOLUTION_TOUR_SETTING,
  SOLUTION_VIEW_CLASSIC,
} from '../../../common/constants';
import type { SpacesManager } from '../../spaces_manager';

export class TourManager {
  private tourState$ = new BehaviorSubject<'not_started' | 'in_progress' | 'ended'>('not_started');
  showTour$ = this.tourState$.pipe(map((state) => state === 'in_progress'));

  constructor(private core: () => Promise<CoreStart>, private spacesManager: SpacesManager) {}

  async startTour(): Promise<{ result: 'not_available' | 'started' }> {
    const isAvailable = await this.isTourAvailable();

    if (!isAvailable) {
      return { result: 'not_available' };
    }

    this.tourState$.next('in_progress');
    return { result: 'started' };
  }

  async finishTour(): Promise<void> {
    this.tourState$.next('ended');
    await preserveTourCompletion(await this.core());
  }

  async waitForTourEnd(): Promise<void> {
    return firstValueFrom(
      this.tourState$.pipe(
        first((state) => state === 'ended'),
        map(() => void 0)
      )
    );
  }

  private async isTourAvailable(): Promise<boolean> {
    const core = await this.core();
    return (
      canManageSpaces(core) &&
      !hasCompletedTour(core) &&
      (await hasSingleDefaultSolutionSpace(this.spacesManager))
    );
  }
}

const canManageSpaces = (core: CoreStart) => {
  return core.application.capabilities.spaces?.manage === true;
};

// the tour is shown only once for the first admin user, presumably the one who created the deployment
const hasCompletedTour = (core: CoreStart) => {
  const showTourUiSettingValue = core.settings.globalClient.get<boolean | undefined>(
    SHOW_SPACE_SOLUTION_TOUR_SETTING
  );
  return showTourUiSettingValue === false;
};

const preserveTourCompletion = async (core: CoreStart) => {
  try {
    await core.settings.globalClient.set(SHOW_SPACE_SOLUTION_TOUR_SETTING, false);
  } catch (error) {
    // Silently swallow errors, the user will just see the tour again next time they load the page
  }
};

const hasSingleDefaultSolutionSpace = async (spacesManager: SpacesManager) => {
  try {
    const allSpaces = await spacesManager.getSpaces();
    if (allSpaces.length > 1) {
      return false;
    }
    const defaultSpace = allSpaces.find((space) => space.id === DEFAULT_SPACE_ID);

    if (!defaultSpace) {
      return false;
    }

    if (defaultSpace.solution && defaultSpace.solution !== SOLUTION_VIEW_CLASSIC) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};
