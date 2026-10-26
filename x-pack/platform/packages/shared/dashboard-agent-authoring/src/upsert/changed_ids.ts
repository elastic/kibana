/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { indexDashboard, type DashboardIndex } from '../dashboard_state';

export interface ChangedIds {
  /** Ids of the panels, sections and controls that did not exist. */
  created: string[];
  /** Ids of the panels, sections and controls that changed, before the layout step. */
  updated: string[];
  /** Ids of the panels, sections and controls that no longer exist, with the panels of removed sections. */
  removed: string[];
}

type IndexedKind = 'panelsById' | 'sectionsById' | 'controlsById';

const INDEXED_KINDS: readonly IndexedKind[] = ['panelsById', 'sectionsById', 'controlsById'];

/** Compares the final dashboard with the original one to list the ids the kept changes touched. */
export const getChangedIds = ({
  original,
  dashboardData,
}: {
  original: DashboardIndex;
  dashboardData: DashboardAttachmentData;
}): ChangedIds => {
  const next = indexDashboard(dashboardData);
  const getIdsMissingFrom = (from: DashboardIndex, to: DashboardIndex): string[] =>
    INDEXED_KINDS.flatMap((kind) => [...from[kind].keys()].filter((id) => !to[kind].has(id)));

  const isPanelUpdated = (id: string): boolean => {
    const originalPanel = original.panelsById.get(id);
    const panel = next.panelsById.get(id);
    return (
      originalPanel !== undefined &&
      panel !== undefined &&
      (!isEqual(originalPanel, panel) ||
        original.sectionIdByPanelId.get(id) !== next.sectionIdByPanelId.get(id))
    );
  };
  const isSectionUpdated = (id: string): boolean => {
    const originalSection = original.sectionsById.get(id);
    const section = next.sectionsById.get(id);
    return (
      originalSection !== undefined &&
      section !== undefined &&
      !isEqual(omit(originalSection, 'panels', 'grid'), omit(section, 'panels', 'grid'))
    );
  };
  const isControlUpdated = (id: string): boolean => {
    const originalControl = original.controlsById.get(id);
    const control = next.controlsById.get(id);
    return (
      originalControl !== undefined && control !== undefined && !isEqual(originalControl, control)
    );
  };

  return {
    created: getIdsMissingFrom(next, original),
    updated: [
      ...new Set([
        ...[...next.panelsById.keys()].filter(isPanelUpdated),
        ...[...next.sectionsById.keys()].filter(isSectionUpdated),
        ...[...next.controlsById.keys()].filter(isControlUpdated),
      ]),
    ],
    removed: getIdsMissingFrom(original, next),
  };
};
