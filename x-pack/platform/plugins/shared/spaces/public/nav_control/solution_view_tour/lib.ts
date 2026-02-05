/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, defer, from, map, of, shareReplay, switchMap } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';

import type { Space } from '../../../common';
import {
  DEFAULT_SPACE_ID,
  SHOW_SPACE_SOLUTION_TOUR_SETTING,
  SOLUTION_VIEW_CLASSIC,
} from '../../../common/constants';
import type { SpacesManager } from '../../spaces_manager';

export function initTour(core: CoreStart, spacesManager: SpacesManager) {
  const showTourUiSettingValue = core.settings.globalClient.get(SHOW_SPACE_SOLUTION_TOUR_SETTING);
  const showTour$ = new BehaviorSubject(showTourUiSettingValue ?? true);

  const allSpaces$ = defer(() => from(spacesManager.getSpaces())).pipe(shareReplay(1));

  const hasMultipleSpaces = (spaces: Space[]) => {
    return spaces.length > 1;
  };

  const isDefaultSpaceOnClassic = (spaces: Space[]) => {
    const defaultSpace = spaces.find((space) => space.id === DEFAULT_SPACE_ID);

    if (!defaultSpace) {
      // Don't show the tour if the default space doesn't exist (this should never happen)
      return true;
    }

    if (!defaultSpace.solution || defaultSpace.solution === SOLUTION_VIEW_CLASSIC) {
      return true;
    }
  };

  const showTourObservable$ = showTour$.pipe(
    switchMap((showTour) => {
      if (!showTour) return of(false);

      return allSpaces$.pipe(
        map((spaces) => {
          if (hasMultipleSpaces(spaces) || isDefaultSpaceOnClassic(spaces)) {
            return false;
          }

          return true;
        })
      );
    })
  );

  const hideTourInGlobalSettings = () => {
    core.settings.globalClient.set(SHOW_SPACE_SOLUTION_TOUR_SETTING, false).catch(() => {
      // Silently swallow errors, the user will just see the tour again next time they load the page
    });
  };

  if (showTourUiSettingValue !== false) {
    allSpaces$.subscribe((spaces) => {
      if (hasMultipleSpaces(spaces) || isDefaultSpaceOnClassic(spaces)) {
        // If we have either (1) multiple space or (2) only one space and it's the default space with the classic solution,
        // we don't want to show the tour later on. This can happen in the following scenarios:
        // - the user deletes all the spaces but one (and that last space has a solution set)
        // - the user edits the default space and sets a solution
        // So we can immediately hide the tour in the global settings from now on.
        hideTourInGlobalSettings();
      }
    });
  }

  const onFinishTour = () => {
    hideTourInGlobalSettings();
    showTour$.next(false);
  };

  return { showTour$: showTourObservable$, onFinishTour };
}
