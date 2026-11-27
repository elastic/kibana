/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { IncidentTimelineAlert } from '../../../../common/types/api';
import type {
  AlertCell,
  TimeWindow,
  TimelineEntry,
  TimelineModel,
  TimelineSelection,
} from '../model';

/**
 * The seam between the panel and a renderer. A renderer draws the lanes of `model` in
 * `window`, picks per-row density from its own width (`renderAlertRow`, `groupCaseMarkers`),
 * and reports interactions. It holds no data state of its own.
 */
export interface TimelineRendererProps {
  model: TimelineModel;
  /** The visible window, the default one or a zoomed one. */
  window: TimeWindow;
  selection?: TimelineSelection;
  /** Shown in place of the alert rows while they load, fail or are empty. */
  alertsPlaceholder?: ReactNode;
  /** Brushed range on the time axis. */
  onBrush: (window: TimeWindow) => void;
  onAlertClick: (alert: IncidentTimelineAlert, ruleName: string) => void;
  onCellClick: (cell: AlertCell) => void;
  onEntryClick: (entry: TimelineEntry) => void;
}
