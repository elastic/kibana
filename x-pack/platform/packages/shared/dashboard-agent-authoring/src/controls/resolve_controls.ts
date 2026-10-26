/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import type { ResolveControlFieldCapabilities } from '../types';
import type { DashboardFailure } from '../utils';
import { assignControlIds } from './control_ids';
import { filterDuplicateTimeSliders } from './filter_time_sliders';
import type { IdentifiedControl, PlannedControl } from './planned_control';
import { resolveControlFields } from './resolve_fields';

/**
 * Resolves the field of every planned control, keeps at most one time slider, and gives the kept
 * controls without an id a readable one. Field failures are listed before time slider failures.
 */
export const resolveControls = async ({
  controls,
  existingControls,
  removedIds,
  takenIds,
  resolveControlFieldCapabilities,
  projectRouting,
  logger,
}: {
  controls: PlannedControl[];
  /** The controls of the original dashboard. */
  existingControls: NonNullable<DashboardAttachmentData['pinned_panels']>;
  /** Ids of the existing controls the call removes. */
  removedIds: ReadonlySet<string>;
  /** Ids of the panels, sections, and controls the dashboard has or the call names. */
  takenIds: Iterable<string>;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  projectRouting?: string;
  logger: Logger;
}): Promise<{ controls: IdentifiedControl[]; failures: DashboardFailure[] }> => {
  const withFields = await resolveControlFields({
    controls,
    resolveControlFieldCapabilities,
    projectRouting,
    logger,
  });
  const kept = filterDuplicateTimeSliders({
    existingControls,
    removedIds,
    controls: withFields.controls,
    logger,
  });
  return {
    controls: assignControlIds(kept.controls, takenIds),
    failures: [...withFields.failures, ...kept.failures],
  };
};
