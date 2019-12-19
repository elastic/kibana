/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { IconType } from '@elastic/eui/src/components/icon/icon';
import { CoreSetup } from 'src/core/public';
import { SavedQuery } from 'src/legacy/core_plugins/data/public';
import { KibanaDatatable } from '../../../../../src/plugins/expressions/public';
import { DragContextState } from './drag_drop';
import { Document } from './persistence';
import { DateRange } from '../common';
import { Query, esFilters } from '../../../../../src/plugins/data/public';

// eslint-disable-next-line
export interface EditorFrameOptions {}

export type ErrorCallback = (e: { message: string }) => void;

export interface PublicAPIProps<T> {
  state: T;
  setState: StateSetter<T>;
  layerId: string;
  dateRange: DateRange;
}

export interface EditorFrameProps {
  onError: ErrorCallback;
  doc?: Document;
  dateRange: DateRange;
  query: Query;
  filters: esFilters.Filter[];
  savedQuery?: SavedQuery;

  // Frame loader (app or embeddable) is expected to call this when it loads and updates
  onChange: (newState: {
    filterableIndexPatterns: DatasourceMetaData['filterableIndexPatterns'];
    doc: Document;
  }) => void;
}
export interface EditorFrameInstance {
  mount: (element: Element, props: EditorFrameProps) => void;
  unmount: () => void;
}

export interface EditorFrameSetup {
  // generic type on the API functions to pull the "unknown vs. specific type" error into the implementation
  registerDatasource: <T, P>(datasource: Datasource<T, P>) => void;
  registerVisualization: <T, P>(visualization: Visualization<T, P>) => void;
}

export interface EditorFrameStart {
  createInstance: (options: EditorFrameOptions) => EditorFrameInstance;
}

// Hints the default nesting to the data source. 0 is the highest priority
export type DimensionPriority = 0 | 1 | 2;

export interface TableSuggestionColumn {
  columnId: string;
  operation: Operation;
}

/**
 * A possible table a datasource can create. This object is passed to the visualization
 * which tries to build a meaningful visualization given the shape of the table. If this
 * is possible, the visualization returns a `VisualizationSuggestion` object
 */
export interface TableSuggestion {
  /**
   * Flag indicating whether the table will include more than one column.
   * This is not the case for example for a single metric aggregation
   * */
  isMultiRow: boolean;
  /**
   * The columns of the table. Each column has to be mapped to a dimension in a chart. If a visualization
   * can't use all columns of a suggestion, it should not return a `VisualizationSuggestion` based on it
   * because there would be unreferenced columns
   */
  columns: TableSuggestionColumn[];
  /**
   * The layer this table will replace. This is only relevant if the visualization this suggestion is passed
   * is currently active and has multiple layers configured. If this suggestion is applied, the table of this
   * layer will be replaced by the columns specified in this suggestion
   */
  layerId: string;
  /**
   * A label describing the table. This can be used to provide a title for the `VisualizationSuggestion`,
   * but the visualization can also decide to overwrite it.
   */
  label?: string;
  /**
   * The change type indicates what was changed in this table compared to the currently active table of this layer.
   */
  changeType: TableChangeType;
}

/**
 * Indicates what was changed in this table compared to the currently active table of this layer.
 * * `initial` means the layer associated with this table does not exist in the current configuration
 * * `unchanged` means the table is the same in the currently active configuration
 * * `reduced` means the table is a reduced version of the currently active table (some columns dropped, but not all of them)
 * * `extended` means the table is an extended version of the currently active table (added one or multiple additional columns)
 * * `layers` means the change is a change to the layer structure, not to the table
 */
export type TableChangeType = 'initial' | 'unchanged' | 'reduced' | 'extended' | 'layers';

export interface DatasourceSuggestion<T = unknown> {
  state: T;
  table: TableSuggestion;
  keptLayerIds: string[];
}

export interface DatasourceMetaData {
  filterableIndexPatterns: Array<{ id: string; title: string }>;
}

export type StateSetter<T> = (newState: T | ((prevState: T) => T)) => void;

/**
 * Interface for the datasource registry
 */
export interface Datasource<T = unknown, P = unknown> {
  id: string;

  // For initializing, either from an empty state or from persisted state
  // Because this will be called at runtime, state might have a type of `any` and
  // datasources should validate their arguments
  initialize: (state?: P) => Promise<T>;

  // Given the current state, which parts should be saved?
  getPersistableState: (state: T) => P;

  insertLayer: (state: T, newLayerId: string) => T;
  removeLayer: (state: T, layerId: string) => T;
  clearLayer: (state: T, layerId: string) => T;
  getLayers: (state: T) => string[];

  renderDataPanel: (domElement: Element, props: DatasourceDataPanelProps<T>) => void;

  toExpression: (state: T, layerId: string) => Ast | string | null;

  getMetaData: (state: T) => DatasourceMetaData;

  getDatasourceSuggestionsForField: (state: T, field: unknown) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsFromCurrentState: (state: T) => Array<DatasourceSuggestion<T>>;

  getPublicAPI: (props: PublicAPIProps<T>) => DatasourcePublicAPI;
}

/**
 * This is an API provided to visualizations by the frame, which calls the publicAPI on the datasource
 */
export interface DatasourcePublicAPI {
  getTableSpec: () => TableSpec;
  getOperationForColumnId: (columnId: string) => Operation | null;

  // Render can be called many times
  renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => void;
  renderLayerPanel: (domElement: Element, props: DatasourceLayerPanelProps) => void;
}

export interface TableSpecColumn {
  // Column IDs are the keys for internal state in data sources and visualizations
  columnId: string;
}

// TableSpec is managed by visualizations
export type TableSpec = TableSpecColumn[];

export interface DatasourceDataPanelProps<T = unknown> {
  state: T;
  dragDropContext: DragContextState;
  setState: StateSetter<T>;
  core: Pick<CoreSetup, 'http' | 'notifications' | 'uiSettings'>;
  query: Query;
  dateRange: DateRange;
  filters: esFilters.Filter[];
}

// The only way a visualization has to restrict the query building
export interface DatasourceDimensionPanelProps {
  layerId: string;
  columnId: string;

  dragDropContext: DragContextState;

  // Visualizations can restrict operations based on their own rules
  filterOperations: (operation: OperationMetadata) => boolean;

  // Visualizations can hint at the role this dimension would play, which
  // affects the default ordering of the query
  suggestedPriority?: DimensionPriority;
  onRemove?: (accessor: string) => void;

  // Some dimension editors will allow users to change the operation grouping
  // from the panel, and this lets the visualization hint that it doesn't want
  // users to have that level of control
  hideGrouping?: boolean;
}

export interface DatasourceLayerPanelProps {
  layerId: string;
}

export type DataType = 'document' | 'string' | 'number' | 'date' | 'boolean' | 'ip';

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation extends OperationMetadata {
  // User-facing label for the operation
  label: string;
}

export interface OperationMetadata {
  // The output of this operation will have this data type
  dataType: DataType;
  // A bucketed operation is grouped by duplicate values, otherwise each row is
  // treated as unique
  isBucketed: boolean;
  scale?: 'ordinal' | 'interval' | 'ratio';
  // Extra meta-information like cardinality, color
  // TODO currently it's not possible to differentiate between a field from a raw
  // document and an aggregated metric which might be handy in some cases. Once we
  // introduce a raw document datasource, this should be considered here.
}

export interface LensMultiTable {
  type: 'lens_multitable';
  tables: Record<string, KibanaDatatable>;
  dateRange?: {
    fromDate: Date;
    toDate: Date;
  };
}

export interface VisualizationLayerConfigProps<T = unknown> {
  layerId: string;
  dragDropContext: DragContextState;
  frame: FramePublicAPI;
  state: T;
  setState: (newState: T) => void;
}

/**
 * Object passed to `getSuggestions` of a visualization.
 * It contains a possible table the current datasource could
 * provide and the state of the visualization if it is currently active.
 *
 * If the current datasource suggests multiple tables, `getSuggestions`
 * is called multiple times with separate `SuggestionRequest` objects.
 */
export interface SuggestionRequest<T = unknown> {
  /**
   * A table configuration the datasource could provide.
   */
  table: TableSuggestion;
  /**
   * State is only passed if the visualization is active.
   */
  state?: T;
  /**
   * The visualization needs to know which table is being suggested
   */
  keptLayerIds: string[];
}

/**
 * A possible configuration of a given visualization. It is based on a `TableSuggestion`.
 * Suggestion might be shown in the UI to be chosen by the user directly, but they are
 * also applied directly under some circumstances (dragging in the first field from the data
 * panel or switching to another visualization in the chart switcher).
 */
export interface VisualizationSuggestion<T = unknown> {
  /**
   * The score of a suggestion should indicate how valuable the suggestion is. It is used
   * to rank multiple suggestions of multiple visualizations. The number should be between 0 and 1
   */
  score: number;
  /**
   * Flag indicating whether this suggestion should not be advertised to the user. It is still
   * considered in scenarios where the available suggestion with the highest suggestion is applied
   * directly.
   */
  hide?: boolean;
  /**
   * Descriptive title of the suggestion. Should be as short as possible. This title is shown if
   * the suggestion is advertised to the user and will also show either the `previewExpression` or
   * the `previewIcon`
   */
  title: string;
  /**
   * The new state of the visualization if this suggestion is applied.
   */
  state: T;
  /**
   * An EUI icon type shown instead of the preview expression.
   */
  previewIcon: IconType;
}

export interface FramePublicAPI {
  datasourceLayers: Record<string, DatasourcePublicAPI>;

  dateRange: DateRange;
  query: Query;
  filters: esFilters.Filter[];

  // Adds a new layer. This has a side effect of updating the datasource state
  addNewLayer: () => string;
  removeLayers: (layerIds: string[]) => void;
}

export interface VisualizationType {
  id: string;
  icon?: IconType;
  largeIcon?: IconType;
  label: string;
}

export interface Visualization<T = unknown, P = unknown> {
  id: string;

  visualizationTypes: VisualizationType[];

  getLayerIds: (state: T) => string[];

  clearLayer: (state: T, layerId: string) => T;

  removeLayer?: (state: T, layerId: string) => T;

  appendLayer?: (state: T, layerId: string) => T;

  renderLayerContextMenu?: (domElement: Element, props: VisualizationLayerConfigProps<T>) => void;

  getDescription: (
    state: T
  ) => {
    icon?: IconType;
    label: string;
  };

  switchVisualizationType?: (visualizationTypeId: string, state: T) => T;

  // For initializing from saved object
  initialize: (frame: FramePublicAPI, state?: P) => T;

  getPersistableState: (state: T) => P;

  renderLayerConfigPanel: (domElement: Element, props: VisualizationLayerConfigProps<T>) => void;

  toExpression: (state: T, frame: FramePublicAPI) => Ast | string | null;

  /**
   * Epression to render a preview version of the chart in very constraint space.
   * If there is no expression provided, the preview icon is used.
   */
  toPreviewExpression?: (state: T, frame: FramePublicAPI) => Ast | string | null;

  // The frame will call this function on all visualizations when the table changes, or when
  // rendering additional ways of using the data
  getSuggestions: (context: SuggestionRequest<T>) => Array<VisualizationSuggestion<T>>;
}
