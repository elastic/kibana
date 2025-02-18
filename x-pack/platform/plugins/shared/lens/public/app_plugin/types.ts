/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { Observable } from 'rxjs';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type {
  ApplicationStart,
  AppMountParameters,
  ChromeStart,
  CoreStart,
  CoreTheme,
  ExecutionContextStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import {
  VisualizeFieldContext,
  ACTION_VISUALIZE_LENS_FIELD,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';
import { ACTION_CONVERT_TO_LENS } from '@kbn/visualizations-plugin/public';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type {
  DatasourceMap,
  EditorFrameInstance,
  VisualizeEditorContext,
  LensTopNavMenuEntryGenerator,
  VisualizationMap,
  UserMessagesGetter,
  StartServices,
} from '../types';
import type { LensAttributesService } from '../lens_attribute_service';
import type { LensInspector } from '../lens_inspector_service';
import type { IndexPatternServiceAPI } from '../data_views_service/service';
import type { LensDocument, SavedObjectIndexStore } from '../persistence/saved_object_store';
import type { LensAppLocator, LensAppLocatorParams } from '../../common/locator/locator';
import { LensSerializedState } from '../react_embeddable/types';

export interface RedirectToOriginProps {
  state?: LensSerializedState;
  isCopied?: boolean;
}

export interface LensAppProps {
  history: History;
  editorFrame: EditorFrameInstance;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  redirectTo: (savedObjectId?: string) => void;
  redirectToOrigin?: (props?: RedirectToOriginProps) => void;

  // The initial input passed in by the container when editing. Can be either by reference or by value.
  initialInput?: LensSerializedState;

  // State passed in by the container which is used to determine the id of the Originating App.
  incomingState?: EmbeddableEditorState;
  datasourceMap: DatasourceMap;
  savedObjectStore: SavedObjectIndexStore;
  visualizationMap: VisualizationMap;
  initialContext?: VisualizeEditorContext | VisualizeFieldContext;
  contextOriginatingApp?: string;
  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
  theme$: Observable<CoreTheme>;
  coreStart: CoreStart;
}

export type RunSave = (
  saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
    returnToOrigin: boolean;
    dashboardId?: string | null;
    onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
    newDescription?: string;
    newTags?: string[];
    panelTimeRange?: TimeRange;
  },
  options: {
    saveToLibrary: boolean;
  }
) => Promise<void>;

export interface LensTopNavMenuProps {
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];

  redirectToOrigin?: (props?: RedirectToOriginProps) => void;
  // The initial input passed in by the container when editing. Can be either by reference or by value.
  initialInput?: LensSerializedState;
  getIsByValueMode: () => boolean;
  indicateNoData: boolean;
  setIsSaveModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  runSave: RunSave;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  title?: string;
  lensInspector: LensInspector;
  goBackToOriginatingApp?: () => void;
  contextOriginatingApp?: string;
  initialContextIsEmbedded?: boolean;
  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  currentDoc: LensDocument | undefined;
  indexPatternService: IndexPatternServiceAPI;
  getUserMessages: UserMessagesGetter;
  shortUrlService: (params: LensAppLocatorParams) => Promise<string>;
  isCurrentStateDirty: boolean;
  startServices: StartServices;
}

export interface HistoryLocationState {
  type: typeof ACTION_VISUALIZE_LENS_FIELD | typeof ACTION_CONVERT_TO_LENS;
  payload: VisualizeFieldContext | VisualizeEditorContext;
  originatingApp?: string;
}

export interface LensAppServices extends StartServices {
  http: HttpStart;
  executionContext: ExecutionContextStart;
  chrome: ChromeStart;
  storage: IStorageWrapper;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  eventAnnotationService: EventAnnotationServiceType;
  inspector: LensInspector;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
  uiActions: UiActionsStart;
  application: ApplicationStart;
  notifications: NotificationsStart;
  usageCollection?: UsageCollectionStart;
  stateTransfer: EmbeddableStateTransfer;
  navigation: NavigationPublicPluginStart;
  attributeService: LensAttributesService;
  contentManagement: ContentManagementPublicStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  getOriginatingAppName: () => string | undefined;
  presentationUtil: PresentationUtilPluginStart;
  spaces?: SpacesApi;
  charts: ChartsPluginSetup;
  share?: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  docLinks: DocLinksStart;
  dataViewEditor: DataViewEditorStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  locator?: LensAppLocator;
  savedObjectStore: SavedObjectIndexStore;
  serverless?: ServerlessPluginStart;
}

interface TopNavAction {
  visible: boolean;
  enabled?: boolean;
  execute: (anchorElement: HTMLElement) => void;
  getLink?: () => string | undefined;
  tooltip?: () => string | undefined;
}

type AvailableTopNavActions =
  | 'inspect'
  | 'saveAndReturn'
  | 'showSaveModal'
  | 'goBack'
  | 'cancel'
  | 'share'
  | 'getUnderlyingDataUrl'
  | 'openSettings';
export type LensTopNavActions = Record<AvailableTopNavActions, TopNavAction>;
