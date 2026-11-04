/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ControlValuesSource,
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_RANGE_SLIDER_STATE,
  DEFAULT_TIME_SLIDER_STATE,
  OPTIONS_LIST_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { DashboardPinnedPanel } from '@kbn/as-code-dashboard-schema';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { getControlId } from '../dashboard_state';
import type { ControlInput } from './schema';
import type { IdentifiedControl } from './planned_control';

const buildStoredControl = (control: ControlInput, id: string): DashboardPinnedPanel => {
  const { type, width = 'medium', grow = true } = control;

  if (type === TIME_SLIDER_CONTROL) {
    return { type, id, width, grow, config: { ...DEFAULT_TIME_SLIDER_STATE } };
  }

  const { field_name, index, title } = control;
  const esqlConfig = {
    ...(title !== undefined ? { title } : {}),
    values_source: ControlValuesSource.ESQL as const,
    esql_query: `FROM ${index} | STATS BY ${formatEsqlIdentifier(field_name)}`,
  };
  return type === OPTIONS_LIST_CONTROL
    ? { type, id, width, grow, config: { ...DEFAULT_DSL_OPTIONS_LIST_STATE, ...esqlConfig } }
    : { type, id, width, grow, config: { ...DEFAULT_RANGE_SLIDER_STATE, ...esqlConfig } };
};

/** Replaces existing controls in place and appends new ones. */
export const applyControls = ({
  dashboardData,
  controls,
}: {
  dashboardData: DashboardAttachmentData;
  controls: IdentifiedControl[];
}): DashboardAttachmentData => {
  if (controls.length === 0) {
    return dashboardData;
  }

  const replacementsById = new Map(
    controls.flatMap(({ control, replaces }) =>
      replaces === undefined ? [] : [[replaces, control] as const]
    )
  );
  const newControls = controls.flatMap(({ control, replaces }) =>
    replaces === undefined ? [control] : []
  );
  return {
    ...dashboardData,
    pinned_panels: [
      ...(dashboardData.pinned_panels ?? []).map((storedControl) => {
        const id = getControlId(storedControl);
        const replacement = id === undefined ? undefined : replacementsById.get(id);
        return replacement && id !== undefined
          ? buildStoredControl(replacement, id)
          : storedControl;
      }),
      ...newControls.map((control) => buildStoredControl(control, control.id)),
    ],
  };
};
