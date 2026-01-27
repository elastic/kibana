/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { css } from '@emotion/react';

import { useEuiTheme, EuiSpacer } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import { type DragDropAction, RootDragDropProvider } from '@kbn/dom-drag-drop';
import type {
  FramePublicAPI,
  Suggestion,
  UserMessagesGetter,
  AddUserMessages,
  LensInspector,
} from '@kbn/lens-common';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getAbsoluteDateRange } from '../../utils';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { useAddLayerButton } from '../../app_plugin/shared/edit_on_the_fly/use_add_layer_button';
import { DataPanelWrapper } from './data_panel_wrapper';
import { BannerWrapper } from './banner_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanelWrapper } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import type { EditorFrameStartPlugins } from '../service';
import { getTopSuggestionForField, switchToSuggestion } from './suggestion_helpers';
import {
  useLensSelector,
  useLensDispatch,
  selectAreDatasourcesLoaded,
  selectFramePublicAPI,
  selectActiveDatasourceId,
  selectDatasourceStates,
  selectVisualization,
} from '../../state_management';
import { ErrorBoundary, showMemoizedErrorNotification } from '../../lens_ui_errors';
import type { IndexPatternServiceAPI } from '../../data_views_service/service';
import { getLongMessage } from '../../user_messages_utils';
import { useEditorFrameService } from '../editor_frame_service_context';
import { VisualizationToolbarWrapper } from './visualization_toolbar';
import { LayerTabsWrapper } from '../../app_plugin/shared/edit_on_the_fly/layer_tabs';

export interface EditorFrameProps {
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
  lensInspector: LensInspector;
  indexPatternService: IndexPatternServiceAPI;
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
}

export function EditorFrame(props: EditorFrameProps) {
  const { euiTheme } = useEuiTheme();
  const { datasourceMap, visualizationMap } = useEditorFrameService();
  const dispatchLens = useLensDispatch();
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const visualization = useLensSelector(selectVisualization);
  const areDatasourcesLoaded = useLensSelector(selectAreDatasourcesLoaded);

  const styles = useMemoCss(componentStyles);

  const isVisualizationLoaded = !!visualization.state;
  const visualizationTypeIsKnown = Boolean(
    visualization.activeId && visualizationMap[visualization.activeId]
  );

  const framePublicAPI: FramePublicAPI = useLensSelector((state) =>
    selectFramePublicAPI(state, datasourceMap)
  );

  framePublicAPI.absDateRange = getAbsoluteDateRange(
    props.plugins.data.query.timefilter.timefilter
  );

  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    if (!field || !activeDatasourceId) {
      return;
    }
    return getTopSuggestionForField(
      framePublicAPI.datasourceLayers,
      visualization,
      datasourceStates,
      visualizationMap,
      datasourceMap[activeDatasourceId],
      field,
      framePublicAPI.dataViews,
      true
    );
  };

  const hasSuggestionForField = useCallback(
    (field: DragDropIdentifier) => getSuggestionForField.current!(field) !== undefined,
    [getSuggestionForField]
  );

  const dropOntoWorkspace = useCallback(
    (field: DragDropIdentifier) => {
      const suggestion = getSuggestionForField.current!(field);
      if (suggestion) {
        trackUiCounterEvents('drop_onto_workspace');
        switchToSuggestion(dispatchLens, suggestion, { clearStagedPreview: true });
      }
    },
    [getSuggestionForField, dispatchLens]
  );

  const onError = useCallback((error: Error) => {
    showMemoizedErrorNotification(error);
  }, []);

  const bannerMessages = props.getUserMessages('banner', { severity: 'warning' });

  const telemetryMiddleware = useCallback((action: DragDropAction) => {
    if (action.type === 'dropToTarget') {
      trackUiCounterEvents('drop_total');
    }
  }, []);

  const addLayerButton = useAddLayerButton(
    framePublicAPI,
    props.core,
    props.plugins.dataViews,
    props.plugins.uiActions,
    () => {}
  );

  return (
    <RootDragDropProvider
      initialState={{ dataTestSubjPrefix: 'lnsDragDrop' }}
      customMiddleware={telemetryMiddleware}
    >
      <FrameLayout
        bannerMessages={
          bannerMessages.length ? (
            <ErrorBoundary onError={onError}>
              <BannerWrapper nodes={bannerMessages.map(getLongMessage)} />
            </ErrorBoundary>
          ) : undefined
        }
        dataPanel={
          <ErrorBoundary onError={onError}>
            <DataPanelWrapper
              core={props.core}
              plugins={props.plugins}
              showNoDataPopover={props.showNoDataPopover}
              dropOntoWorkspace={dropOntoWorkspace}
              hasSuggestionForField={hasSuggestionForField}
              indexPatternService={props.indexPatternService}
              frame={framePublicAPI}
            />
          </ErrorBoundary>
        }
        configPanel={
          areDatasourcesLoaded && (
            <ErrorBoundary onError={onError}>
              <>
                <div
                  css={css`
                    background-color: ${euiTheme.colors.backgroundBaseHighlighted};
                    border-bottom: ${euiTheme.border.thin};
                  `}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    css={styles.visualizationToolbar}
                    justifyContent="flexEnd"
                    responsive={false}
                    wrap={true}
                  >
                    <EuiFlexItem grow={false} data-test-subj="lnsVisualizationToolbar">
                      <VisualizationToolbarWrapper
                        framePublicAPI={framePublicAPI}
                        isInlineEditing={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{addLayerButton}</EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                </div>
                <LayerTabsWrapper
                  coreStart={props.core}
                  framePublicAPI={framePublicAPI}
                  uiActions={props.plugins.uiActions}
                />
                <div
                  css={css`
                    background-color: ${euiTheme.colors.emptyShade};
                  `}
                >
                  <ConfigPanelWrapper
                    core={props.core}
                    framePublicAPI={framePublicAPI}
                    uiActions={props.plugins.uiActions}
                    dataViews={props.plugins.dataViews}
                    data={props.plugins.data}
                    indexPatternService={props.indexPatternService}
                    getUserMessages={props.getUserMessages}
                  />
                </div>
              </>
            </ErrorBoundary>
          )
        }
        workspacePanel={
          areDatasourcesLoaded &&
          isVisualizationLoaded && (
            <ErrorBoundary onError={onError}>
              <WorkspacePanel
                core={props.core}
                plugins={props.plugins}
                ExpressionRenderer={props.ExpressionRenderer}
                lensInspector={props.lensInspector}
                framePublicAPI={framePublicAPI}
                getSuggestionForField={getSuggestionForField.current}
                getUserMessages={props.getUserMessages}
                addUserMessages={props.addUserMessages}
              />
            </ErrorBoundary>
          )
        }
        suggestionsPanel={
          visualizationTypeIsKnown &&
          areDatasourcesLoaded && (
            <ErrorBoundary onError={onError}>
              <SuggestionPanelWrapper
                ExpressionRenderer={props.ExpressionRenderer}
                frame={framePublicAPI}
                getUserMessages={props.getUserMessages}
                nowProvider={props.plugins.data.nowProvider}
                core={props.core}
                showOnlyIcons
              />
            </ErrorBoundary>
          )
        }
      />
    </RootDragDropProvider>
  );
}

const componentStyles = {
  visualizationToolbar: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s} ${euiTheme.size.base}`,
    }),
};
