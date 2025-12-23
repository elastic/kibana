/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { isEqual, partition } from 'lodash';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiAccordion,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  euiScrollBarStyles,
  EuiWindowEvent,
  keys,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { FormBasedLayer, TypedLensSerializedState } from '@kbn/lens-common';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import { buildExpression } from '../../../editor_frame_service/editor_frame/expression_helpers';
import { MAX_NUM_OF_COLUMNS } from '../../../datasources/text_based/utils';
import {
  useLensSelector,
  selectFramePublicAPI,
  onActiveDataChange,
  useLensDispatch,
} from '../../../state_management';
import { EXPRESSION_BUILD_ERROR_ID, getAbsoluteDateRange } from '../../../utils';
import { LayerConfiguration } from './layer_configuration_section';
import type { EditConfigPanelProps } from './types';
import { FlyoutWrapper } from './flyout_wrapper';
import { SuggestionPanel } from '../../../editor_frame_service/editor_frame/suggestion_panel';
import { VisualizationToolbarWrapper } from '../../../editor_frame_service/editor_frame/visualization_toolbar';
import { useEditorFrameService } from '../../../editor_frame_service/editor_frame_service_context';
import { useApplicationUserMessages } from '../../get_application_user_messages';
import { trackSaveUiCounterEvents } from '../../../lens_ui_telemetry';
import { useCurrentAttributes } from './use_current_attributes';
import { deleteUserChartTypeFromSessionStorage } from '../../../chart_type_session_storage';
import { ESQLDataGridAccordion } from './esql_data_grid_accordion';
import { getSuggestions, getGridAttrs, type ESQLDataGridAttrs } from './helpers';
import { LayerTabsWrapper } from './layer_tabs';
import { useAddLayerButton } from './use_add_layer_button';

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  datasourceId,
  updatePanelState,
  updateSuggestion,
  setCurrentAttributes,
  closeFlyout,
  saveByRef,
  savedObjectId,
  updateByRefInput,
  dataLoading$,
  lensAdapters,
  navigateToLensEditor,
  displayFlyoutHeader,
  canEditTextBasedQuery,
  isNewPanel,
  hidesSuggestions,
  onApply: onApplyCallback,
  onCancel: onCancelCallback,
  hideTimeFilterInfo,
  isReadOnly,
  parentApi,
  panelId,
  applyButtonLabel,
}: EditConfigPanelProps) {
  const euiTheme = useEuiTheme();
  const previousAttributes = useRef<TypedLensSerializedState['attributes']>(attributes);
  const previousAdapters = useRef<Partial<DefaultInspectorAdapters> | undefined>(lensAdapters);
  const prevQuery = useRef<AggregateQuery | Query>(attributes.state.query);
  const [query, setQuery] = useState<AggregateQuery | Query>(attributes.state.query);
  const [errors, setErrors] = useState<Error[] | undefined>();
  const { datasourceMap, visualizationMap } = useEditorFrameService();
  const [isInlineFlyoutVisible, setIsInlineFlyoutVisible] = useState(true);
  const [isLayerAccordionOpen, setIsLayerAccordionOpen] = useState(true);
  const [suggestsLimitedColumns, setSuggestsLimitedColumns] = useState(false);
  const [isSuggestionsAccordionOpen, setIsSuggestionsAccordionOpen] = useState(false);
  const [isESQLResultsAccordionOpen, setIsESQLResultsAccordionOpen] = useState(false);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);
  const [dataGridAttrs, setDataGridAttrs] = useState<ESQLDataGridAttrs | undefined>(undefined);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeDatasource = datasourceMap[datasourceId];

  const { datasourceStates, visualization, isLoading, annotationGroups, searchSessionId } =
    useLensSelector((state) => state.lens);

  const activeVisualization =
    visualizationMap[visualization.activeId ?? attributes.visualizationType];

  const framePublicAPI = useLensSelector((state) => selectFramePublicAPI(state, datasourceMap));

  framePublicAPI.absDateRange = getAbsoluteDateRange(
    startDependencies.data.query.timefilter.timefilter
  );

  const layers = useMemo(
    () => activeDatasource.getLayers(datasourceState),
    [activeDatasource, datasourceState]
  );

  // needed for text based languages mode which works ONLY with adHoc dataviews
  const adHocDataViews = Object.values(attributes.state.adHocDataViews ?? {});

  const dispatch = useLensDispatch();
  useEffect(() => {
    const s = dataLoading$?.subscribe(() => {
      const activeData: Record<string, Datatable> = {};
      const adaptersTables = previousAdapters.current?.tables?.tables;
      const [table] = Object.values(adaptersTables || {});
      if (table) {
        // there are cases where a query can return a big amount of columns
        // at this case we don't suggest all columns in a table but the first
        // MAX_NUM_OF_COLUMNS
        setSuggestsLimitedColumns(table.columns.length >= MAX_NUM_OF_COLUMNS);
        layers.forEach((layer) => {
          activeData[layer] = table;
        });

        dispatch(onActiveDataChange({ activeData }));
      }
    });
    return () => s?.unsubscribe();
  }, [dispatch, dataLoading$, layers]);

  useEffect(() => {
    const abortController = new AbortController();
    const getESQLGridAttrs = async () => {
      if (!dataGridAttrs && isOfAggregateQueryType(query)) {
        const { dataView, columns, rows } = await getGridAttrs(
          query,
          adHocDataViews,
          startDependencies.data,
          coreStart.http,
          coreStart.uiSettings,
          abortController
        );

        setDataGridAttrs({
          rows,
          dataView,
          columns,
        });
      }
    };
    getESQLGridAttrs();
  }, [
    adHocDataViews,
    coreStart.http,
    coreStart.uiSettings,
    dataGridAttrs,
    query,
    startDependencies,
  ]);

  const attributesChanged = useMemo<boolean>(() => {
    if (isNewPanel) return true;

    const previousAttrs = previousAttributes.current;
    const datasourceStatesAreSame =
      datasourceStates[datasourceId].state && previousAttrs.state.datasourceStates[datasourceId]
        ? datasourceMap[datasourceId].isEqual(
            previousAttrs.state.datasourceStates[datasourceId],
            previousAttrs.references,
            datasourceStates[datasourceId].state,
            // Extract references from the current state as they contain resolved data view IDs
            // We cannot use attributes.references because they may contain stale data view IDs from when the panel was initially loaded
            datasourceMap[datasourceId].getPersistableState(datasourceStates[datasourceId].state)
              .references
          )
        : false;

    if (!datasourceStatesAreSame) return true;

    const visualizationState = visualization.state;
    const customIsEqual = visualizationMap[previousAttrs.visualizationType]?.isEqual;
    const visualizationStateIsEqual = customIsEqual
      ? (() => {
          try {
            return customIsEqual(
              previousAttrs.state.visualization,
              previousAttrs.references,
              visualizationState,
              attributes.references,
              annotationGroups
            );
          } catch (err) {
            return false;
          }
        })()
      : isEqual(visualizationState, previousAttrs.state.visualization);

    return !visualizationStateIsEqual;
  }, [
    datasourceStates,
    datasourceId,
    datasourceMap,
    attributes.references,
    visualization.state,
    isNewPanel,
    visualizationMap,
    annotationGroups,
  ]);

  const onCancel = useCallback(() => {
    const previousAttrs = previousAttributes.current;
    if (attributesChanged) {
      if (previousAttrs.visualizationType === visualization.activeId) {
        const currentDatasourceState = datasourceMap[datasourceId].injectReferencesToLayers
          ? datasourceMap[datasourceId]?.injectReferencesToLayers?.(
              previousAttrs.state.datasourceStates[datasourceId],
              previousAttrs.references
            )
          : previousAttrs.state.datasourceStates[datasourceId];
        updatePanelState?.(currentDatasourceState, previousAttrs.state.visualization);
      } else {
        updateSuggestion?.(previousAttrs);
      }
      if (savedObjectId) {
        updateByRefInput?.(savedObjectId);
      }
    }
    // Remove the user's preferred chart type from localStorage
    deleteUserChartTypeFromSessionStorage();
    onCancelCallback?.();
    closeFlyout?.();
  }, [
    attributesChanged,
    closeFlyout,
    visualization.activeId,
    savedObjectId,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateSuggestion,
    updateByRefInput,
    onCancelCallback,
  ]);

  const textBasedMode = isOfAggregateQueryType(attributes.state.query);

  const currentAttributes = useCurrentAttributes({
    textBasedMode,
    initialAttributes: attributes,
  });

  const onApply = useCallback(() => {
    if (visualization.activeId == null || !currentAttributes) {
      return;
    }
    if (savedObjectId) {
      saveByRef?.(currentAttributes);
      updateByRefInput?.(savedObjectId);
    }

    // check if visualization type changed, if it did, don't pass the previous visualization state
    const prevVisState =
      previousAttributes.current.visualizationType === visualization.activeId
        ? previousAttributes.current.state.visualization
        : undefined;
    const telemetryEvents = activeVisualization.getTelemetryEventsOnSave?.(
      visualization.state,
      prevVisState
    );
    if (telemetryEvents && telemetryEvents.length) {
      trackSaveUiCounterEvents(telemetryEvents);
    }

    onApplyCallback?.(currentAttributes);
    // Remove the user's preferred chart type from sessionStorage
    deleteUserChartTypeFromSessionStorage();
    closeFlyout?.();
  }, [
    visualization.activeId,
    savedObjectId,
    closeFlyout,
    onApplyCallback,
    visualization.state,
    activeVisualization,
    currentAttributes,
    saveByRef,
    updateByRefInput,
  ]);

  const { getUserMessages } = useApplicationUserMessages({
    coreStart,
    framePublicAPI,
    activeDatasourceId: datasourceId,
    datasourceState: datasourceStates[datasourceId],
    datasource: datasourceMap[datasourceId],
    dispatch,
    visualization: activeVisualization,
    visualizationType: visualization.activeId,
    visualizationState: visualization,
  });

  const editorContainer = useRef(null);

  const isSaveable = useMemo(() => {
    if (!attributesChanged) {
      return false;
    }
    if (!visualization.state || !visualization.activeId) {
      return false;
    }
    const visualizationErrors = getUserMessages(['visualization'], {
      severity: 'error',
    });
    // shouldn't build expression if there is any type of error other than an expression build error
    // (in which case we try again every time because the config might have changed)
    if (visualizationErrors.every((error) => error.uniqueId === EXPRESSION_BUILD_ERROR_ID)) {
      return Boolean(
        buildExpression({
          visualization: activeVisualization,
          visualizationState: visualization.state,
          datasourceMap,
          datasourceStates,
          datasourceLayers: framePublicAPI.datasourceLayers,
          indexPatterns: framePublicAPI.dataViews.indexPatterns,
          dateRange: framePublicAPI.dateRange,
          nowInstant: startDependencies.data.nowProvider.get(),
          searchSessionId,
        })
      );
    }
  }, [
    attributesChanged,
    activeVisualization,
    datasourceMap,
    datasourceStates,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    framePublicAPI.datasourceLayers,
    searchSessionId,
    startDependencies.data.nowProvider,
    visualization.activeId,
    visualization.state,
    getUserMessages,
  ]);

  const addLayerButton = useAddLayerButton(
    framePublicAPI,
    coreStart,
    startDependencies.dataViews,
    startDependencies.uiActions,
    setIsInlineFlyoutVisible
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === keys.ESCAPE) {
      closeFlyout?.();
      setIsInlineFlyoutVisible(false);
      // Remove the user's preferred chart type from sessionStorage
      deleteUserChartTypeFromSessionStorage();
    }
  };

  const layerIds = useMemo(() => {
    return activeVisualization && visualization.state
      ? activeVisualization.getLayerIds(visualization.state)
      : [];
  }, [activeVisualization, visualization.state]);

  const runQuery = useCallback(
    async (q: AggregateQuery, abortController?: AbortController) => {
      const attrs = await getSuggestions(
        q,
        startDependencies.data,
        coreStart.http,
        coreStart.uiSettings,
        datasourceMap,
        visualizationMap,
        adHocDataViews,
        setErrors,
        abortController,
        setDataGridAttrs
      );
      if (attrs) {
        setCurrentAttributes?.(attrs);
        setErrors([]);
        updateSuggestion?.(attrs);
      }
      prevQuery.current = q;
      setIsVisualizationLoading(false);
    },
    [
      startDependencies,
      coreStart,
      datasourceMap,
      visualizationMap,
      adHocDataViews,
      setCurrentAttributes,
      updateSuggestion,
    ]
  );

  const isSingleLayerVisualization = layerIds.length === 1;

  const showConvertToEsqlButton = useMemo(() => {
    const isDevMode = process.env.NODE_ENV === 'development';
    return isDevMode && !textBasedMode && isSingleLayerVisualization;
  }, [textBasedMode, isSingleLayerVisualization]);

  // The button is disabled when the visualization cannot be converted to ES|QL
  const { isConvertToEsqlButtonDisabled } = useMemo(() => {
    if (!isSingleLayerVisualization || textBasedMode || !datasourceState) {
      return { isConvertToEsqlButtonDisabled: true };
    }

    // Validate datasourceState structure
    if (
      typeof datasourceState !== 'object' ||
      datasourceState === null ||
      !('layers' in datasourceState) ||
      !datasourceState.layers
    ) {
      return { isConvertToEsqlButtonDisabled: true };
    }

    // Access the single layer safely
    const datasourceStateLayers = datasourceState.layers as Record<string, FormBasedLayer>;
    const layerId = layerIds[0];

    if (!layerId || !(layerId in datasourceStateLayers)) {
      return { isConvertToEsqlButtonDisabled: true };
    }

    const singleLayer = datasourceStateLayers[layerId];
    if (!singleLayer || !singleLayer.columnOrder || !singleLayer.columns) {
      return { isConvertToEsqlButtonDisabled: true };
    }

    // Get the esAggEntries
    const { columnOrder } = singleLayer;
    const columns = { ...singleLayer.columns };
    const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);
    const [, esAggEntries] = partition(
      columnEntries,
      ([, col]) =>
        operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
        operationDefinitionMap[col.operationType]?.input === 'managedReference'
    );

    const esqlLayer = getESQLForLayer(
      esAggEntries,
      singleLayer,
      framePublicAPI.dataViews.indexPatterns[singleLayer.indexPatternId],
      coreStart.uiSettings,
      framePublicAPI.dateRange,
      startDependencies.data.nowProvider.get()
    );

    return { isConvertToEsqlButtonDisabled: !esqlLayer };
  }, [
    coreStart.uiSettings,
    datasourceState,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    isSingleLayerVisualization,
    layerIds,
    startDependencies.data.nowProvider,
    textBasedMode,
  ]);

  if (isLoading) return null;

  const toolbar = (
    <>
      <EuiFlexItem grow={false} data-test-subj="lnsVisualizationToolbar">
        <VisualizationToolbarWrapper framePublicAPI={framePublicAPI} isInlineEditing={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{addLayerButton}</EuiFlexItem>
      {showConvertToEsqlButton ? (
        <EuiToolTip
          position="top"
          content={
            isConvertToEsqlButtonDisabled ? (
              <p>
                {i18n.translate('xpack.lens.config.cannotConvertToEsqlDescription', {
                  defaultMessage: 'This visualization cannot be converted to ES|QL',
                })}
              </p>
            ) : (
              <p>
                {i18n.translate('xpack.lens.config.convertToEsqlDescription', {
                  defaultMessage: 'Convert visualization to ES|QL',
                })}
              </p>
            )
          }
        >
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="success"
              display="base"
              size="s"
              iconType="code"
              aria-label={i18n.translate('xpack.lens.config.convertToEsqlLabel', {
                defaultMessage: 'Convert to ES|QL',
              })}
              isDisabled={isConvertToEsqlButtonDisabled}
            />
          </EuiFlexItem>
        </EuiToolTip>
      ) : null}
    </>
  );

  const layerTabs = (
    <LayerTabsWrapper
      attributes={attributes}
      coreStart={coreStart}
      uiActions={startDependencies.uiActions}
      framePublicAPI={framePublicAPI}
    />
  );

  // Example is the Discover editing where we dont want to render the text based editor on the panel, neither the suggestions (for now)
  if (!canEditTextBasedQuery && hidesSuggestions) {
    return (
      <>
        {isInlineFlyoutVisible && <EuiWindowEvent event="keydown" handler={onKeyDown} />}
        <FlyoutWrapper
          isInlineFlyoutVisible={isInlineFlyoutVisible}
          displayFlyoutHeader={displayFlyoutHeader}
          onCancel={onCancel}
          navigateToLensEditor={navigateToLensEditor}
          onApply={onApply}
          isScrollable
          isNewPanel={isNewPanel}
          isSaveable={isSaveable}
          isReadOnly={isReadOnly}
          applyButtonLabel={applyButtonLabel}
          toolbar={toolbar}
          layerTabs={layerTabs}
        >
          <LayerConfiguration
            // TODO: remove this once we support switching to any chart in Discover
            onlyAllowSwitchToSubtypes
            getUserMessages={getUserMessages}
            attributes={attributes}
            coreStart={coreStart}
            startDependencies={startDependencies}
            datasourceId={datasourceId}
            hasPadding
            framePublicAPI={framePublicAPI}
            setIsInlineFlyoutVisible={setIsInlineFlyoutVisible}
            updateSuggestion={updateSuggestion}
            setCurrentAttributes={setCurrentAttributes}
            closeFlyout={closeFlyout}
            parentApi={parentApi}
            panelId={panelId}
            canEditTextBasedQuery={canEditTextBasedQuery}
          />
        </FlyoutWrapper>
      </>
    );
  }

  return (
    <>
      {isInlineFlyoutVisible && <EuiWindowEvent event="keydown" handler={onKeyDown} />}
      <FlyoutWrapper
        isInlineFlyoutVisible={isInlineFlyoutVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
        isSaveable={isSaveable}
        isScrollable
        isNewPanel={isNewPanel}
        isReadOnly={isReadOnly}
        applyButtonLabel={applyButtonLabel}
        toolbar={toolbar}
        layerTabs={layerTabs}
      >
        <EuiFlexGroup
          css={css`
            block-size: 100%;
            .euiFlexItem,
            .euiAccordion,
            .euiAccordion__triggerWrapper,
            .euiAccordion__childWrapper {
              min-block-size: 0;
            }
            .euiAccordion {
              display: flex;
              flex: 1;
              flex-direction: column;
            }
            .euiAccordion-isOpen {
              .euiAccordion__childWrapper {
                // Override euiAccordion__childWrapper blockSize only when ES|QL mode is enabled
                block-size: auto ${textBasedMode ? '!important' : ''};
                flex: 1;
              }
            }
            .euiAccordion__childWrapper {
              ${euiScrollBarStyles(euiTheme)}
              overflow-y: auto !important;
              pointer-events: none;

              padding-left: ${euiTheme.euiTheme.components.forms.maxWidth};
              margin-left: -${euiTheme.euiTheme.components.forms.maxWidth};
              > * {
                pointer-events: auto;
              }
            }
            .lnsIndexPatternDimensionEditor-advancedOptions {
              .euiAccordion__childWrapper {
                flex: none;
                overflow: hidden !important;
              }
            }
          `}
          direction="column"
          gutterSize="none"
        >
          {isOfAggregateQueryType(query) && canEditTextBasedQuery && (
            <EuiFlexItem grow={false} data-test-subj="InlineEditingESQLEditor">
              <ESQLLangEditor
                query={query}
                onTextLangQueryChange={(q) => {
                  setQuery(q);
                }}
                detectedTimestamp={adHocDataViews?.[0]?.timeFieldName}
                hideTimeFilterInfo={hideTimeFilterInfo}
                errors={errors}
                warning={
                  suggestsLimitedColumns
                    ? i18n.translate('xpack.lens.config.configFlyoutCallout', {
                        defaultMessage:
                          'Displaying a limited portion of the available fields. Add more from the configuration panel.',
                      })
                    : undefined
                }
                editorIsInline
                hideRunQueryText
                onTextLangQuerySubmit={async (q, a) => {
                  // do not run the suggestions if the query is the same as the previous one
                  if (q && !isEqual(q, prevQuery.current)) {
                    setIsVisualizationLoading(true);
                    await runQuery(q, a);
                  }
                }}
                isDisabled={false}
                allowQueryCancellation
                isLoading={isVisualizationLoading}
              />
            </EuiFlexItem>
          )}
          {isOfAggregateQueryType(query) && canEditTextBasedQuery && dataGridAttrs && (
            <ESQLDataGridAccordion
              dataGridAttrs={dataGridAttrs}
              isAccordionOpen={isESQLResultsAccordionOpen}
              setIsAccordionOpen={setIsESQLResultsAccordionOpen}
              query={query}
              isTableView={attributes.visualizationType !== 'lnsDatatable'}
              onAccordionToggleCb={(status) => {
                if (status && isSuggestionsAccordionOpen) {
                  setIsSuggestionsAccordionOpen(!status);
                }
                if (status && isLayerAccordionOpen) {
                  setIsLayerAccordionOpen(!status);
                }
              }}
            />
          )}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              css={css`
                > * {
                  flex-grow: 0;
                }
              `}
              gutterSize="none"
              direction="column"
              ref={editorContainer}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={isLayerAccordionOpen ? 1 : false}
            css={css`
              .euiAccordion__childWrapper {
                flex: ${isLayerAccordionOpen ? 1 : 'none'};
              }
              padding: 0 ${euiTheme.euiTheme.size.base};
            `}
          >
            <EuiAccordion
              id="layer-configuration"
              buttonContent={
                <EuiTitle
                  size="xxs"
                  css={css`
                    padding: 2px;
                  `}
                >
                  <h5>
                    {i18n.translate('xpack.lens.config.visualizationConfigurationLabel', {
                      defaultMessage: 'Visualization parameters',
                    })}
                  </h5>
                </EuiTitle>
              }
              buttonProps={{
                paddingSize: 'm',
              }}
              initialIsOpen={isLayerAccordionOpen}
              forceState={isLayerAccordionOpen ? 'open' : 'closed'}
              onToggle={(status) => {
                if (status && isSuggestionsAccordionOpen) {
                  setIsSuggestionsAccordionOpen(!status);
                }
                if (status && isESQLResultsAccordionOpen) {
                  setIsESQLResultsAccordionOpen(!status);
                }
                setIsLayerAccordionOpen(!isLayerAccordionOpen);
              }}
            >
              <>
                <LayerConfiguration
                  attributes={attributes}
                  dataLoading$={dataLoading$}
                  lensAdapters={lensAdapters}
                  getUserMessages={getUserMessages}
                  coreStart={coreStart}
                  startDependencies={startDependencies}
                  datasourceId={datasourceId}
                  framePublicAPI={framePublicAPI}
                  setIsInlineFlyoutVisible={setIsInlineFlyoutVisible}
                  updateSuggestion={updateSuggestion}
                  setCurrentAttributes={setCurrentAttributes}
                  closeFlyout={closeFlyout}
                  parentApi={parentApi}
                  panelId={panelId}
                  canEditTextBasedQuery={canEditTextBasedQuery}
                  editorContainer={editorContainer.current || undefined}
                />
              </>
            </EuiAccordion>
          </EuiFlexItem>

          <EuiFlexItem
            grow={isSuggestionsAccordionOpen ? 1 : false}
            data-test-subj="InlineEditingSuggestions"
            css={css`
              border-top: ${euiTheme.euiTheme.border.thin};
              border-bottom: ${euiTheme.euiTheme.border.thin};
              padding-left: ${euiTheme.euiTheme.size.base};
              padding-right: ${euiTheme.euiTheme.size.base};
              .euiAccordion__childWrapper {
                flex: ${isSuggestionsAccordionOpen ? 1 : 'none'};
              }
            `}
          >
            <SuggestionPanel
              ExpressionRenderer={startDependencies.expressions.ReactExpressionRenderer}
              frame={framePublicAPI}
              core={coreStart}
              nowProvider={startDependencies.data.nowProvider}
              showOnlyIcons
              wrapSuggestions
              isAccordionOpen={isSuggestionsAccordionOpen}
              toggleAccordionCb={(status) => {
                if (!status && isLayerAccordionOpen) {
                  setIsLayerAccordionOpen(status);
                }
                if (status && isESQLResultsAccordionOpen) {
                  setIsESQLResultsAccordionOpen(!status);
                }
                setIsSuggestionsAccordionOpen(!isSuggestionsAccordionOpen);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutWrapper>
    </>
  );
}
