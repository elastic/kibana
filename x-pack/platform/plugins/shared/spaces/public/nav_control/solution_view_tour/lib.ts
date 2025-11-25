/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, first, firstValueFrom, map } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import type { PublicContract } from '@kbn/utility-types';

import {
  DEFAULT_SPACE_ID,
  SHOW_SPACE_SOLUTION_TOUR_SETTING,
  SOLUTION_VIEW_CLASSIC,
} from '../../../common/constants';
import type { SpacesManager } from '../../spaces_manager';

export type TourManagerContract = PublicContract<TourManager>;

export class TourManager {
  private tourState$ = new BehaviorSubject<'not_started' | 'in_progress' | 'ended'>('not_started');
  showTour$ = this.tourState$.pipe(map((state) => state === 'in_progress'));

  constructor(private core: () => Promise<CoreStart>, private spacesManager: SpacesManager) {}

  async startTour(): Promise<{ result: 'not_available' | 'started' }> {
    const core = await this.core();
    if (!canManageSpaces(core) || hasCompletedTour(core)) {
      return { result: 'not_available' };
    }

    if (await hasSingleDefaultSolutionSpace(this.spacesManager)) {
      // we have a single space, and it's not the classic solution, so we can show the tour
      // presumably the user is the admin who created the deployment
      this.tourState$.next('in_progress');
      return { result: 'started' };
    } else {
      // If we have either (1) multiple space or (2) only one space and it's the default space with the classic solution,
      // we don't want to show the tour later on. This can happen in the following scenarios:
      // - the user deletes all the spaces but one (and that last space has a solution set)
      // - the user edits the default space and sets a solution
      // So we can immediately hide the tour in the global settings from now on.
      await preserveTourCompletion(core);
      return { result: 'not_available' };
    }
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
