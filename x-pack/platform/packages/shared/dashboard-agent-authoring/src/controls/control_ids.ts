/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DashboardFailure } from '../utils';
import type { ControlInput } from './schema';
import type { IdentifiedControl, PlannedControl } from './planned_control';

/**
 * Readable id the agent can repeat, e.g. "host.name-options-list" or "time-slider", with a numeric
 * suffix when another panel, section, or control already uses it.
 */
const createControlId = (control: ControlInput, usedIds: Set<string>): string => {
  const kind = control.type.replace(/_control$/, '').replace(/_/g, '-');
  const baseId = control.type === TIME_SLIDER_CONTROL ? kind : `${control.field_name}-${kind}`;
  let id = baseId;
  for (let suffix = 2; usedIds.has(id); suffix++) {
    id = `${baseId}-${suffix}`;
  }
  usedIds.add(id);
  return id;
};

/**
 * Gives every control without an id a readable one that no `takenIds` or other control uses, so it
 * cannot be mistaken for a panel, section, or control the dashboard had or the call names.
 */
export const assignControlIds = (
  controls: PlannedControl[],
  takenIds: Iterable<string>
): IdentifiedControl[] => {
  const usedIds = new Set([...takenIds, ...controls.flatMap(({ control: { id } }) => id ?? [])]);
  return controls.map((plannedControl) => {
    const { control } = plannedControl;
    return {
      ...plannedControl,
      control: { ...control, id: control.id ?? createControlId(control, usedIds) },
    };
  });
};

/**
 * Reports failures of controls sent without an id under their position in `controls`, like every
 * other failure of those controls, instead of the id they were given.
 */
export const reportUnderPlannedIdentifiers = (
  failures: DashboardFailure[],
  controls: IdentifiedControl[]
): DashboardFailure[] => {
  const identifierByAssignedId = new Map(
    controls.flatMap(({ identifier, control: { id } }) =>
      identifier === id ? [] : [[id, identifier] as const]
    )
  );
  return failures.map((failure) => {
    const identifier =
      failure.kind === 'control' ? identifierByAssignedId.get(failure.identifier) : undefined;
    return identifier === undefined ? failure : { ...failure, identifier };
  });
};
