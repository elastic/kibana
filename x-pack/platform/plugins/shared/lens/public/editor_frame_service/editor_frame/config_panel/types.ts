/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LensInspector } from '../../../lens_inspector_service';
import type { TypedLensSerializedState } from '../../../react_embeddable/types';
import type { IndexPatternServiceAPI } from '../../../data_views_service/service';

import {
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  DatasourceMap,
  VisualizationMap,
  UserMessagesGetter,
  AddLayerFunction,
  RegisterLibraryAnnotationGroupFunction,
  StateSetter,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
} from '../../../types';

export interface ConfigPanelWrapperProps {
  framePublicAPI: FramePublicAPI;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  core: DatasourceDimensionEditorProps['core'];
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  indexPatternService?: IndexPatternServiceAPI;
  uiActions: UiActionsStart;
  getUserMessages?: UserMessagesGetter;
  hideLayerHeader?: boolean;
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
  canEditTextBasedQuery?: boolean;
  editorContainer?: HTMLElement;
}

export interface LayerPanelProps {
  attributes?: TypedLensSerializedState['attributes'];
  /** Embeddable output observable, useful for dashboard flyout  */
  dataLoading$?: PublishingSubject<boolean | undefined>;
  /** Contains the active data, necessary for some panel configuration such as coloring */
  lensAdapters?: ReturnType<LensInspector['getInspectorAdapters']>;
  data: DataPublicPluginStart;
  updateSuggestion?: (attrs: TypedLensSerializedState['attributes']) => void;
  /** Set the attributes state */
  setCurrentAttributes?: (attrs: TypedLensSerializedState['attributes']) => void;
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  framePublicAPI: FramePublicAPI;
  core: DatasourceDimensionEditorProps['core'];
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
  registerNewLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
  toggleFullscreen: () => void;
  onEmptyDimensionAdd: (columnId: string, group: { groupId: string }) => void;
  onChangeIndexPattern: (args: {
    indexPatternId: string;
    layerId: string;
    datasourceId?: string;
    visualizationId?: string;
  }) => void;
  indexPatternService?: IndexPatternServiceAPI;
  getUserMessages?: UserMessagesGetter;
  displayLayerSettings: boolean;
  setIsInlineFlyoutVisible?: (status: boolean) => void;
  onlyAllowSwitchToSubtypes?: boolean;
  panelId?: string;
  parentApi?: unknown;
  closeFlyout?: () => void;
  canEditTextBasedQuery?: boolean;
  editorContainer?: HTMLElement;
}

export interface LayerDatasourceDropProps {
  state: unknown;
  setState: (newState: unknown) => void;
}
