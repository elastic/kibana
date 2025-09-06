/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, defer, from, map, of, shareReplay, switchMap, tap } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import { startNavigationTour } from '@kbn/core-chrome-navigation-tour';

import type { Space } from '../../../common';
import {
  DEFAULT_SPACE_ID,
  SHOW_SPACE_SOLUTION_TOUR_SETTING,
  SOLUTION_VIEW_CLASSIC,
} from '../../../common/constants';
import type { SpacesManager } from '../../spaces_manager';

export function initTour(core: CoreStart, spacesManager: SpacesManager) {
  const canManageSpaces = core.application.capabilities.spaces?.manage === true;

  if (!canManageSpaces) {
    // If the user can't manage spaces, we never show the tour, as this tour is meant for admins
    return {
      showTour$: of(false),
      onFinishTour: () => {},
    };
  }

  const showTourUiSettingValue = core.settings.globalClient.get<boolean | undefined>(
    SHOW_SPACE_SOLUTION_TOUR_SETTING
  );
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
            // If we have either (1) multiple space or (2) only one space and it's the default space with the classic solution,
            // we don't want to show the tour later on. This can happen in the following scenarios:
            // - the user deletes all the spaces but one (and that last space has a solution set)
            // - the user edits the default space and sets a solution
            // So we can immediately hide the tour in the global settings from now on.
            hideTourInGlobalSettings();
            return false;
          }

          return true;
        })
      );
    }),
    tap((showTour) => {
      if (!showTour) {
        startNavigationTour({
          globalStepOffset: 0,
        });
      }
    })
  );

  const hideTourInGlobalSettings = () => {
    if (showTourUiSettingValue === false) return; // already disabled, nothing to do

    alert('hiding solution view tour forever'); // TODO: remove
    // core.settings.globalClient.set(SHOW_SPACE_SOLUTION_TOUR_SETTING, false).catch(() => {
    //   // Silently swallow errors, the user will just see the tour again next time they load the page
    // });
  };

  const onFinishTour = () => {
    hideTourInGlobalSettings();
    startNavigationTour({
      globalStepOffset: 1,
    });
    showTour$.next(false);
  };

  return { showTour$: showTourObservable$, onFinishTour };
}
