/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ColumnHeaderOptions, DeprecatedRowRenderer } from '../..';
import { BrowserFields, TimelineNonEcsData } from '../../../search_strategy';

/**
 * The following props are provided to the function called by `renderCellValue`.
 * Warning: This type might be outdated. Therefore, migrate to the new one from
 * `solutions/security/plugins/security_solution/common/types/timeline/cells/index.ts`.
 * @deprecated
 */
export type DeprecatedCellValueElementProps = EuiDataGridCellValueElementProps & {
  asPlainText?: boolean;
  browserFields?: BrowserFields;
  data: TimelineNonEcsData[];
  ecsData?: Ecs;
  eventId: string; // _id
  globalFilters?: Filter[];
  header: ColumnHeaderOptions;
  isDraggable: boolean;
  isTimeline?: boolean; // Default cell renderer is used for both the alert table and timeline. This allows us to cheaply separate concerns
  linkValues: string[] | undefined;
  rowRenderers?: DeprecatedRowRenderer[];
  setFlyoutAlert?: (alertId: string) => void;
  scopeId: string;
  truncate?: boolean;
  key?: string;
  closeCellPopover?: () => void;
  enableActions?: boolean;
};
