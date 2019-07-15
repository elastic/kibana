/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { DragContextState } from './drag_drop';

// eslint-disable-next-line
export interface EditorFrameOptions {}

export type ErrorCallback = (e: { message: string }) => void;

export interface EditorFrameInstance {
  mount: (element: Element, props: { onError: ErrorCallback }) => void;
  unmount: () => void;
}

export interface EditorFrameSetup {
  createInstance: (options: EditorFrameOptions) => EditorFrameInstance;
  // generic type on the API functions to pull the "unknown vs. specific type" error into the implementation
  registerDatasource: <T, P>(name: string, datasource: Datasource<T, P>) => void;
  registerVisualization: <T, P>(name: string, visualization: Visualization<T, P>) => void;
}

// Hints the default nesting to the data source. 0 is the highest priority
export type DimensionPriority = 0 | 1 | 2;

// 0 is the default layer, layers are joined sequentially but there can only be one 'join' layer
export type DimensionLayer = 'join' | number;

export interface TableSuggestionColumn {
  columnId: string;
  operation: Operation;
  layer?: DimensionLayer;
}

export interface TableSuggestion {
  datasourceSuggestionId: number;
  isMultiRow: boolean;
  columns: TableSuggestionColumn[];
}

export interface DatasourceSuggestion<T = unknown> {
  state: T;
  table: TableSuggestion;
}

/**
 * Interface for the datasource registry
 */
export interface Datasource<T = unknown, P = unknown> {
  // For initializing, either from an empty state or from persisted state
  // Because this will be called at runtime, state might have a type of `any` and
  // datasources should validate their arguments
  initialize: (state?: P) => Promise<T>;

  // Given the current state, which parts should be saved?
  getPersistableState: (state: T) => P;

  insertLayer: (state: T, newLayerId: string) => T;

  renderDataPanel: (domElement: Element, props: DatasourceDataPanelProps<T>) => void;

  toExpression: (state: T) => Ast | string | null;

  getDatasourceSuggestionsForField: (state: T, field: unknown) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsFromCurrentState: (state: T) => Array<DatasourceSuggestion<T>>;

  getPublicAPI: (state: T, setState: (newState: T) => void) => DatasourcePublicAPI;
}

/**
 * This is an API provided to visualizations by the frame, which calls the publicAPI on the datasource
 */
export interface DatasourcePublicAPI {
  getTableSpec: () => TableSpec;
  getOperationForColumnId: (columnId: string) => Operation | null;

  // Render can be called many times
  renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => void;

  removeColumnInTableSpec: (columnId: string) => void;
  moveColumnTo: (columnId: string, targetIndex: number) => void;
  duplicateColumn: (columnId: string) => TableSpec;
}

export interface TableSpecColumn {
  // Column IDs are the keys for internal state in data sources and visualizations
  columnId: string;
  layer?: DimensionLayer;
}

// TableSpec is managed by visualizations
export type TableSpec = TableSpecColumn[];

export interface DatasourceDataPanelProps<T = unknown> {
  state: T;
  dragDropContext: DragContextState;
  setState: (newState: T) => void;
}

// The only way a visualization has to restrict the query building
export interface DatasourceDimensionPanelProps {
  // layerId: DimensionLayer;
  layerId: string;

  columnId: string;

  dragDropContext: DragContextState;

  // Visualizations can restrict operations based on their own rules
  filterOperations: (operation: Operation) => boolean;

  // Visualizations can hint at the role this dimension would play, which
  // affects the default ordering of the query
  suggestedPriority?: DimensionPriority;
}

export type DataType = 'string' | 'number' | 'date' | 'boolean';

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation {
  // Operation ID is a reference to the operation
  id: string;
  // User-facing label for the operation
  label: string;
  // The output of this operation will have this data type
  dataType: DataType;
  // A bucketed operation is grouped by duplicate values, otherwise each row is
  // treated as unique
  isBucketed: boolean;

  // Extra meta-information like cardinality, color
}

// This is a temporary type definition, to be replaced with
// the official Kibana Datatable type definition.
export interface KibanaDatatable {
  type: 'kibana_datatable';
  rows: Array<Record<string, unknown>>;
  columns: Array<{ id: string; name: string }>;
}

export interface VisualizationProps<T = unknown> {
  dragDropContext: DragContextState;
  datasource: DatasourcePublicAPI;
  frame: FramePublicAPI;
  state: T;
  setState: (newState: T) => void;
}

export interface SuggestionRequest<T = unknown> {
  // It is up to the Visualization to rank these tables
  tables: TableSuggestion[];
  state?: T; // State is only passed if the visualization is active
}

export interface VisualizationSuggestion<T = unknown> {
  score: number;
  title: string;
  state: T;
  datasourceSuggestionId: number;
  previewExpression?: Ast | string;
  previewIcon: string;
}

export interface FramePublicAPI {
  datasourceLayers: Record<string, DatasourcePublicAPI>;
  layerIdToDatasource: Record<string, string>;
  // Adds a new layer. This triggers a re-render
  addNewLayer: () => void;
}

export interface Visualization<T = unknown, P = unknown> {
  // For initializing from saved object
  // initialize: (frame: FramePublicAPI, datasource: DatasourcePublicAPI, state?: P) => T;
  initialize: (frame: FramePublicAPI, state?: P) => T;

  getPersistableState: (state: T) => P;

  renderConfigPanel: (domElement: Element, props: VisualizationProps<T>) => void;

  // toExpression: (state: T, datasource: DatasourcePublicAPI) => Ast | string | null;
  toExpression: (state: T, frame: FramePublicAPI) => Ast | string | null;

  // The frame will call this function on all visualizations when the table changes, or when
  // rendering additional ways of using the data
  getSuggestions: (options: SuggestionRequest<T>) => Array<VisualizationSuggestion<T>>;
}
