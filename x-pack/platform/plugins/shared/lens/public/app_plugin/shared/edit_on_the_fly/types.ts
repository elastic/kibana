/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { TypedLensSerializedState } from '../../../react_embeddable/types';
import type { LensPluginStartDependencies } from '../../../plugin';
import type {
  DatasourceMap,
  VisualizationMap,
  FramePublicAPI,
  UserMessagesGetter,
} from '../../../types';
import type { LensInspector } from '../../../lens_inspector_service';
import type { LensDocument } from '../../../persistence';

export interface FlyoutWrapperProps {
  children: JSX.Element;
  isInlineFlyoutVisible: boolean;
  isScrollable: boolean;
  displayFlyoutHeader?: boolean;
  language?: string;
  isNewPanel?: boolean;
  isSaveable?: boolean;
  onCancel?: () => void;
  onApply?: () => void;
  navigateToLensEditor?: () => void;
}

export interface EditConfigPanelProps {
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  /** The attributes of the Lens embeddable */
  attributes: TypedLensSerializedState['attributes'];
  /** Callback for updating the visualization and datasources state.*/
  updatePanelState: (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationId?: string
  ) => void;
  updateSuggestion?: (attrs: TypedLensSerializedState['attributes']) => void;
  /** Set the attributes state */
  setCurrentAttributes?: (attrs: TypedLensSerializedState['attributes']) => void;
  /** Lens visualizations can be either created from ESQL (textBased) or from dataviews (formBased) */
  datasourceId: 'formBased' | 'textBased';
  /** Embeddable output observable, useful for dashboard flyout  */
  dataLoading$?: PublishingSubject<boolean | undefined>;
  /** Contains the active data, necessary for some panel configuration such as coloring */
  lensAdapters?: ReturnType<LensInspector['getInspectorAdapters']>;
  /** Optional callback called when updating the by reference embeddable */
  updateByRefInput?: (soId: string) => void;
  /** Callback for closing the edit flyout */
  closeFlyout?: () => void;
  /** Boolean used for adding a flyout wrapper */
  wrapInFlyout?: boolean;
  /** Optional parameter for panel identification
   * If not given, Lens generates a new one
   */
  panelId?: string;
  /** Optional parameter for saved object id
   * Should be given if the lens embeddable is a by reference one
   * (saved in the library)
   */
  savedObjectId?: string;
  /** Callback for saving the embeddable as a SO */
  saveByRef?: (attrs: LensDocument) => void;
  /** Optional callback for navigation from the header of the flyout */
  navigateToLensEditor?: () => void;
  /** If set to true it displays a header on the flyout */
  displayFlyoutHeader?: boolean;
  /** If set to true the layout changes to accordion and the text based query (i.e. ES|QL) can be edited */
  canEditTextBasedQuery?: boolean;
  /** The flyout is used for adding a new panel by scratch */
  isNewPanel?: boolean;
  /** If set to true the layout changes to accordion and the text based query (i.e. ES|QL) can be edited */
  hidesSuggestions?: boolean;
  /** Apply button handler */
  onApply?: (attrs: TypedLensSerializedState['attributes']) => void;
  /** Cancel button handler */
  onCancel?: () => void;
  // in cases where the embeddable is not filtered by time
  // (e.g. through unified search) set this property to true
  hideTimeFilterInfo?: boolean;
  /** The dashboard api, important for creating controls from the ES|QL editor */
  parentApi?: unknown;
}

export interface LayerConfigurationProps {
  attributes: TypedLensSerializedState['attributes'];
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  datasourceId: 'formBased' | 'textBased';
  framePublicAPI: FramePublicAPI;
  hasPadding?: boolean;
  setIsInlineFlyoutVisible: (flag: boolean) => void;
  getUserMessages: UserMessagesGetter;
  onlyAllowSwitchToSubtypes?: boolean;
}
