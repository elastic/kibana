/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import { getControlId } from '../dashboard_state';
import type { DashboardFailure } from '../utils';
import {
  createControlFailure,
  isReported,
  type ControlsResult,
  type PlannedControl,
} from './planned_control';

/**
 * Keep at most one time slider. A control that replaces an existing time slider with another one
 * keeps its slot. Other time sliders take the slot only when no existing time slider is left after
 * removals and replacements; extra ones are reported when {@link isReported}.
 */
export const filterDuplicateTimeSliders = ({
  existingControls,
  removedIds,
  controls,
  logger,
}: {
  existingControls: NonNullable<DashboardAttachmentData['pinned_panels']>;
  removedIds: ReadonlySet<string>;
  controls: PlannedControl[];
  logger: Logger;
}): ControlsResult => {
  const existingTimeSliders = existingControls.filter(({ type }) => type === TIME_SLIDER_CONTROL);
  const existingTimeSliderIds = new Set(
    existingTimeSliders.flatMap((control) => getControlId(control) ?? [])
  );
  const isInPlaceTimeSlider = ({ control: { type }, replaces }: PlannedControl) =>
    type === TIME_SLIDER_CONTROL && replaces !== undefined && existingTimeSliderIds.has(replaces);
  const replacedIds = new Set(controls.flatMap(({ replaces }) => replaces ?? []));
  const hasTimeSlider =
    controls.some(isInPlaceTimeSlider) ||
    existingTimeSliders.some((control) => {
      const id = getControlId(control);
      return id === undefined || (!removedIds.has(id) && !replacedIds.has(id));
    });
  let canAddTimeSlider = !hasTimeSlider;
  const failures: DashboardFailure[] = [];

  const keptControls = controls.filter((plannedControl) => {
    const { identifier, control } = plannedControl;
    if (control.type !== TIME_SLIDER_CONTROL || isInPlaceTimeSlider(plannedControl)) {
      return true;
    }

    if (canAddTimeSlider) {
      canAddTimeSlider = false;
      return true;
    }

    if (!isReported(plannedControl)) {
      logger.debug(`Left out ${identifier}: the dashboard already has a time slider.`);
      return false;
    }

    failures.push(
      createControlFailure(identifier, 'A dashboard can contain at most one time_slider_control.')
    );
    return false;
  });
  return { controls: keptControls, failures };
};
