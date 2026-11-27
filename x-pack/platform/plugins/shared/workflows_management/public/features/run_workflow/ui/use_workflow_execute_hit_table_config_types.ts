/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellPopoverElementProps, euiFontSize } from '@elastic/eui';
import type * as React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
  SortOrder,
  UnifiedDataTable,
  UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';
import type { WorkflowExecuteKibanaServices } from './workflow_execute_unified_table_base';

export interface UseWorkflowExecuteHitTableConfigOptions {
  services: WorkflowExecuteKibanaServices;
  dataView: DataView | null;
  hits: EsHitRecord[];
  defaultColumns: readonly string[];
  externalCustomRenderers?: CustomCellRenderer;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  ensureColumnWhenOnlyTimeField?: string;
  onSelectionChange: (selectedRecords: DataTableRecord[]) => void;
  setErrors?: (errors: string | null) => void;
  tableSort?: SortOrder[];
  onTableSortChange?: (sort: SortOrder[]) => void;
}

export interface UseWorkflowExecuteHitTableConfigResult {
  visibleTableColumns: string[];
  showTimeColumn: boolean;
  sort: SortOrder[];
  dataTableRows: DataTableRecord[];
  externalCustomRenderers: CustomCellRenderer;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  unifiedDataTableServices: React.ComponentProps<typeof UnifiedDataTable>['services'];
  getNoCellActions: UiActionsStart['getTriggerCompatibleActions'];
  handleSortChange: (nextSort: string[][]) => void;
  handleUnifiedDataTableSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
  timestampCellTypography: ReturnType<typeof euiFontSize>;
  renderCustomToolbar: UnifiedDataTableRenderCustomToolbar;
  renderCellPopover: (popoverProps: EuiDataGridCellPopoverElementProps) => React.JSX.Element;
}
