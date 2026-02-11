/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  TypedLensSerializedState,
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  UserMessagesGetter,
  AddLayerFunction,
  RegisterLibraryAnnotationGroupFunction,
  StateSetter,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
  LensInspector,
} from '@kbn/lens-common';
import type { IndexPatternServiceAPI } from '../../../data_views_service/service';

export interface TextBasedQueryState {
  /** Whether the query has errors from the last run attempt */
  hasErrors: boolean;
  /** Whether the query has been modified but not yet submitted */
  isQueryPendingSubmit: boolean;
}

export interface LensConfigPanelBaseProps {
  framePublicAPI: FramePublicAPI;
  core: DatasourceDimensionEditorProps['core'];
  data: DataPublicPluginStart;
  indexPatternService?: IndexPatternServiceAPI;
  getUserMessages?: UserMessagesGetter;
  setIsInlineFlyoutVisible?: (status: boolean) => void;
  onlyAllowSwitchToSubtypes?: boolean;
  attributes?: TypedLensSerializedState['attributes'];
  /** Embeddable output observable, useful for dashboard flyout  */
  dataLoading$?: PublishingSubject<boolean | undefined>;
  /** Contains the active data, necessary for some panel configuration such as coloring */
  lensAdapters?: ReturnType<LensInspector['getInspectorAdapters']>;
  updateSuggestion?: (attrs: TypedLensSerializedState['attributes']) => void;
  /** Set the attributes state */
  setCurrentAttributes?: (attrs: TypedLensSerializedState['attributes']) => void;
  parentApi?: unknown;
  panelId?: string;
  closeFlyout?: () => void;
  editorContainer?: HTMLElement;
  /** Callback to report text-based query state changes */
  onTextBasedQueryStateChange?: (state: TextBasedQueryState) => void;
}

export interface ConfigPanelWrapperProps extends LensConfigPanelBaseProps {
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  hideLayerHeader?: boolean;
}

export interface LayerPanelProps extends LensConfigPanelBaseProps {
  visualizationState: unknown;
  activeVisualization: Visualization;
  dimensionGroups: VisualizationDimensionGroupConfig[];
  layerId: string;
  layerIndex: number;
  isOnlyLayer: boolean;
  addLayer: AddLayerFunction;
  registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
  updateVisualization: StateSetter<unknown>;
  onDropToDimension: (payload: {
    source: DragDropIdentifier;
    target: DragDropOperation;
    dropType: DropType;
  }) => void;
  updateDatasource: (
    datasourceId: string | undefined,
    newState: unknown,
    dontSyncLinkedDimensions?: boolean
  ) => void;
  updateDatasourceAsync: (datasourceId: string | undefined, newState: unknown) => void;
  updateAll: (
    datasourceId: string | undefined,
    newDatasourcestate: unknown,
    newVisualizationState: unknown
  ) => void;
  onRemoveLayer: (layerId: string) => void;
  onCloneLayer: () => void;
  onRemoveDimension: (props: { columnId: string; layerId: string }) => void;
  toggleFullscreen: () => void;
  onEmptyDimensionAdd: (columnId: string, group: { groupId: string }) => void;
  onChangeIndexPattern: (args: {
    indexPatternId: string;
    layerId: string;
    datasourceId?: string;
    visualizationId?: string;
  }) => void;
  displayLayerSettings: boolean;
}

export interface LayerDatasourceDropProps {
  state: unknown;
  setState: (newState: unknown) => void;
}
