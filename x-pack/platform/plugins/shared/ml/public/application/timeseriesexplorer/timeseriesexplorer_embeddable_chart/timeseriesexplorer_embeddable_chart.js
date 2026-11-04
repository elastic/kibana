/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import { isEqual } from 'lodash';
import moment from 'moment-timezone';
import { Subject, Subscription } from 'rxjs';

import PropTypes from 'prop-types';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { context } from '@kbn/kibana-react-plugin/public';
import { aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { takeUntilAborted } from '../../util/take_until_aborted';
import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';
import { ForecastingModal } from '../components/forecasting_modal/forecasting_modal';
import { TimeseriesexplorerNoChartData } from '../components/timeseriesexplorer_no_chart_data';

import { APP_STATE_ACTION, CHARTS_POINT_TARGET } from '../timeseriesexplorer_constants';
import { getControlsForDetector } from '../get_controls_for_detector';
import { TimeSeriesChartWithTooltips } from '../components/timeseries_chart/timeseries_chart_with_tooltip';
import { isMetricDetector } from '../get_function_description';
import { TimeseriesexplorerChartDataError } from '../components/timeseriesexplorer_chart_data_error';
import { TimeseriesExplorerCheckbox } from './timeseriesexplorer_checkbox';
import { timeBucketsServiceFactory } from '../../util/time_buckets_service';
import { timeSeriesExplorerServiceFactory } from '../../util/time_series_explorer_service';
import { getTimeseriesexplorerDefaultState } from '../timeseriesexplorer_utils';
import { mlJobServiceFactory } from '../../services/job_service';
import { forecastServiceFactory } from '../../services/forecast_service';
import { EntityFieldNamesAndFilterButtons } from './timeseriesexplorer_title';
import {
  SingleMetricViewerChartSurface,
  applySmvTableFilter,
  buildCriteriaFields,
  consumeSmvContextLoadResult,
  fetchAnomaliesTableData$,
  buildSmvEmptyFocusStatePatch,
  getModelPlotEnabledForDetector,
  getSmvContextLoadErrorMessages,
  getSmvDataReloadPlan,
  getSmvFocusLoadErrorMessage,
  loadSingleMetricContextData,
  smvReloadSnapshotFromSmvHostProps,
  subscribeSmvBrushToFocusZoom,
} from '../timeseriesexplorer_chart_controller';

export class TimeSeriesExplorerEmbeddableChart extends React.Component {
  static propTypes = {
    api: PropTypes.object,
    appStateHandler: PropTypes.func.isRequired,
    autoZoomDuration: PropTypes.number.isRequired,
    bounds: PropTypes.object.isRequired,
    chartWidth: PropTypes.number.isRequired,
    chartHeight: PropTypes.number,
    lastRefresh: PropTypes.number.isRequired,
    onLoading: PropTypes.func,
    onRenderComplete: PropTypes.func,
    requestCancellationManager: PropTypes.object,
    previousRefresh: PropTypes.number.isRequired,
    selectedJob: PropTypes.object.isRequired,
    selectedJobStats: PropTypes.object.isRequired,
    selectedJobId: PropTypes.string.isRequired,
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.oneOfType([PropTypes.number, PropTypes.array, PropTypes.object]),
    zoom: PropTypes.object,
    toastNotificationService: PropTypes.object,
    dataViewsService: PropTypes.object,
    onForecastComplete: PropTypes.func,
  };

  state = getTimeseriesexplorerDefaultState();

  subscriptions = new Subscription();

  unmounted = false;

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject();

  /**
   * When false, skips anomalies table fetches in the brush → focus pipeline.
   */
  includeAnomaliesTable = true;

  /**
   * Access ML services in react context.
   */
  static contextType = context;

  contextLoadAbortController;

  /** Signal of the focus load currently in flight, used to tell cancellation apart from empty data. */
  focusLoadSignal;

  /**
   * True from the start of a context load until its automatic (debounced) focus load starts.
   * That focus load isn't a user action, so it must not lift a cancellation made in between.
   */
  autoFocusLoadPending = false;

  /** Bumped synchronously at the start of each context load so an aborted load can tell a successor has started. */
  loadGeneration = 0;

  /**
   * True while a refresh is waiting to schedule its focus load. The previous focus series is still
   * in state, and the pipeline would otherwise skip the load the panel loading flag is waiting on.
   */
  pendingRefreshFocus = false;

  /**
   * Last chart that finished loading. A cancel restores this instead of leaving the context
   * series from the in-flight load next to the previous focus series.
   */
  chartSnapshot;

  /** Fields a context or focus load replaces. User toggles (show/hide series) are left as they are. */
  static chartSnapshotFields = [
    'chartDetails',
    'contextAggregationInterval',
    'contextChartData',
    'contextForecastData',
    'dataNotChartable',
    'focusAggregationInterval',
    'focusAnnotationData',
    'focusChartData',
    'focusForecastData',
    'fullRefresh',
    'hasResults',
    'modelPlotEnabled',
    'showAnnotationsCheckbox',
    'showForecastCheckbox',
    'showModelBoundsCheckbox',
    'swimlaneData',
    'tableData',
    'zoomFrom',
    'zoomTo',
    'zoomFromFocusLoaded',
    'zoomToFocusLoaded',
  ];

  getBoundsRoundedToInterval;
  mlTimeSeriesExplorer;
  mlForecastService;

  /**
   * Returns field names that don't have a selection yet.
   */
  getFieldNamesWithEmptyValues = () => {
    const latestEntityControls = this.getControlsForDetector();
    return latestEntityControls
      .filter(({ fieldValue }) => fieldValue === null)
      .map(({ fieldName }) => fieldName);
  };

  /**
   * Checks if all entity control dropdowns have a selection.
   */
  arePartitioningFieldsProvided = () => {
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    return fieldNamesWithEmptyValues.length === 0;
  };

  toggleShowAnnotationsHandler = () => {
    this.setState((prevState) => ({
      showAnnotations: !prevState.showAnnotations,
    }));
  };

  toggleShowForecastHandler = () => {
    this.setState((prevState) => ({
      showForecast: !prevState.showForecast,
    }));
  };

  toggleShowModelBoundsHandler = () => {
    this.setState({
      showModelBounds: !this.state.showModelBounds,
    });
  };

  setFunctionDescription = (selectedFuction) => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FUNCTION_DESCRIPTION, selectedFuction);
  };

  previousChartProps = {};
  previousShowAnnotations = undefined;
  previousShowForecast = undefined;
  previousShowModelBounds = undefined;

  tableFilter = (field, value, operator) => {
    applySmvTableFilter(field, value, operator, this.getControlsForDetector(), (entities) =>
      this.props.appStateHandler(APP_STATE_ACTION.SET_ENTITIES, entities)
    );
  };

  contextChartSelectedInitCallDone = false;

  getFocusAggregationInterval(selection) {
    const { selectedJob } = this.props;

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return this.mlTimeSeriesExplorer.calculateAggregationInterval(
      bounds,
      CHARTS_POINT_TARGET,
      selectedJob
    );
  }

  /**
   * Gets focus data for the current component state
   */
  getFocusData(selection) {
    const { selectedForecastId, selectedDetectorIndex, functionDescription, selectedJob } =
      this.props;
    const { modelPlotEnabled } = this.state;
    if (isMetricDetector(selectedJob, selectedDetectorIndex) && functionDescription === undefined) {
      return;
    }
    const entityControls = this.getControlsForDetector();

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };
    const focusAggregationInterval = this.getFocusAggregationInterval(selection);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = this.getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);

    return this.mlTimeSeriesExplorer.getFocusData(
      this.getCriteriaFields(selectedDetectorIndex, entityControls),
      selectedDetectorIndex,
      focusAggregationInterval,
      selectedForecastId,
      modelPlotEnabled,
      entityControls.filter((entity) => entity.fieldValue !== null),
      searchBounds,
      selectedJob,
      functionDescription,
      this.focusLoadSignal
    );
  }

  /**
   * @param selection brushed range to load into the focus chart
   * @param forceFocus true when this selection comes from a refresh. By the time the context
   *   request returns, `previousRefresh` has caught up with `lastRefresh`, so the duplicate-brush
   *   check would otherwise skip the focus load that `onRenderComplete` is waiting on.
   * @returns whether a focus load was scheduled
   */
  contextChartSelected = (selection, forceFocus = false) => {
    const zoomState = {
      from: selection.from.toISOString(),
      to: selection.to.toISOString(),
    };

    if (
      !forceFocus &&
      isEqual(this.props.zoom, zoomState) &&
      this.state.focusChartData !== undefined &&
      this.props.previousRefresh === this.props.lastRefresh
    ) {
      return false;
    }

    this.contextChart$.next(selection);
    this.props.appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);
    return true;
  };

  loadAnomaliesTableData = (earliestMs, latestMs) => {
    const {
      dateFormatTz,
      selectedDetectorIndex,
      selectedJob,
      tableInterval,
      tableSeverity,
      functionDescription,
    } = this.props;
    const entityControls = this.getControlsForDetector();

    return fetchAnomaliesTableData$({
      mlApi: this.context.services.mlServices.mlApi,
      jobId: selectedJob.job_id,
      criteriaFields: this.getCriteriaFields(selectedDetectorIndex, entityControls),
      tableInterval,
      tableSeverity,
      earliestMs,
      latestMs,
      dateFormatTz,
      functionDescription,
      enrichment: { source: 'singleJob', selectedJob },
    });
  };

  setForecastId = (forecastId) => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FORECAST_ID, forecastId);
  };

  captureChartSnapshot = () => {
    const state = {};
    for (const field of TimeSeriesExplorerEmbeddableChart.chartSnapshotFields) {
      state[field] = this.state[field];
    }
    return { state, zoom: this.props.zoom };
  };

  /** Remember the chart before the first in-flight load replaces any of it. Later commits overwrite this. */
  ensureChartSnapshot = () => {
    if (this.chartSnapshot === undefined) {
      this.chartSnapshot = this.captureChartSnapshot();
    }
  };

  commitChartSnapshot = () => {
    this.chartSnapshot = this.captureChartSnapshot();
  };

  revertToChartSnapshot = () => {
    if (this.unmounted) {
      return;
    }
    this.pendingRefreshFocus = false;
    const snapshot = this.chartSnapshot;
    const finish = () => {
      this.props.onRenderComplete?.();
    };
    if (snapshot === undefined) {
      this.setState({ loading: false, fullRefresh: false }, finish);
      return;
    }
    this.setState({ ...snapshot.state, loading: false, chartDataError: undefined }, finish);
    if (!isEqual(this.props.zoom, snapshot.zoom)) {
      this.props.appStateHandler(
        snapshot.zoom === undefined ? APP_STATE_ACTION.UNSET_ZOOM : APP_STATE_ACTION.SET_ZOOM,
        snapshot.zoom
      );
    }
  };

  displayErrorToastMessages = (error, errorMsg) => {
    if (this.props.toastNotificationService) {
      this.props.toastNotificationService.displayErrorToast(error, errorMsg, 2000);
    }
    this.setState({ loading: false, chartDataError: errorMsg }, () => {
      this.props.onRenderComplete?.();
    });
  };

  loadSingleMetricData = (fullRefresh = true) => {
    const {
      autoZoomDuration,
      bounds,
      selectedDetectorIndex,
      zoom,
      functionDescription,
      selectedJob,
    } = this.props;

    const { loadCounter: currentLoadCounter } = this.state;
    if (selectedJob === undefined) {
      return;
    }
    if (isMetricDetector(selectedJob, selectedDetectorIndex) && functionDescription === undefined) {
      return;
    }

    const functionToPlotByIfMetric = aggregationTypeTransform.toES(functionDescription);

    // The embeddable owns cancellation. This load stops when that signal or the local controller aborts.
    const { requestCancellationManager } = this.props;
    // Captured before the async context request. A later render updates `previousRefresh`, so the
    // completion path can no longer tell a refresh apart from a duplicate brush.
    const forceFocus = this.props.previousRefresh !== this.props.lastRefresh;
    this.pendingRefreshFocus = forceFocus;
    this.loadGeneration = (this.loadGeneration ?? 0) + 1;
    const generation = this.loadGeneration;
    this.contextLoadAbortController?.abort(AbortReason.REPLACED);
    this.contextLoadAbortController = new AbortController();
    const contextLoadSignal = requestCancellationManager
      ? AbortSignal.any([this.contextLoadAbortController.signal, requestCancellationManager.signal])
      : this.contextLoadAbortController.signal;
    if (contextLoadSignal.aborted) {
      // Cancelled before the load started: don't send requests until the next load.
      if (generation === this.loadGeneration && contextLoadSignal.reason !== AbortReason.REPLACED) {
        this.revertToChartSnapshot();
      }
      return;
    }
    this.ensureChartSnapshot();
    contextLoadSignal.addEventListener(
      'abort',
      () => {
        // A replaced load is followed by a new one that manages the loading state.
        // A user cancel puts the previous finished chart back; context may already be applied.
        if (
          !this.unmounted &&
          generation === this.loadGeneration &&
          contextLoadSignal.reason !== AbortReason.REPLACED
        ) {
          this.revertToChartSnapshot();
        }
      },
      { once: true }
    );

    this.contextChartSelectedInitCallDone = false;
    this.autoFocusLoadPending = true;

    this.props.onLoading?.(true);

    // Only when `fullRefresh` is true we show the loading spinner within the page and reset all
    // data. The reset is deferred until the new data has loaded (or failed), so that cancelling the
    // load keeps showing the previous data.
    const entityControls = this.getControlsForDetector();
    const fullRefreshResetPatch = fullRefresh
      ? {
          chartDetails: undefined,
          contextChartData: undefined,
          contextForecastData: undefined,
          focusChartData: undefined,
          focusForecastData: undefined,
          showForecastCheckbox: false,
          modelPlotEnabled: getModelPlotEnabledForDetector(
            selectedJob,
            selectedDetectorIndex,
            entityControls
          ),
          hasResults: false,
          dataNotChartable: false,
        }
      : {};
    this.setState(
      {
        fullRefresh,
        loadCounter: currentLoadCounter + 1,
        loading: true,
        chartDataError: undefined,
      },
      () => {
        const { loadCounter } = this.state;
        const modelPlotEnabled =
          fullRefreshResetPatch.modelPlotEnabled ?? this.state.modelPlotEnabled;
        const detectorIndex = selectedDetectorIndex;

        loadSingleMetricContextData({
          signal: contextLoadSignal,
          bounds,
          selectedJob,
          detectorIndex,
          entityControls,
          modelPlotEnabled,
          selectedForecastId: this.props.selectedForecastId,
          functionToPlotByIfMetric,
          functionDescription: this.props.functionDescription,
          zoom,
          previousSelectedForecastId: this.previousSelectedForecastId,
          autoZoomDuration,
          arePartitioningFieldsProvided: this.arePartitioningFieldsProvided(),
          criteriaFields: this.getCriteriaFields(detectorIndex, entityControls),
          displayError: (error, message) => {
            // A failed load can't be cancelled, so the previous data is no longer relevant.
            if (loadCounter === this.state.loadCounter) {
              this.setState(fullRefreshResetPatch);
            }
            this.displayErrorToastMessages(error, message);
          },
          errorMessages: getSmvContextLoadErrorMessages(this.props.selectedForecastId),
          deps: {
            mlTimeSeriesSearchService: this.context.services.mlServices.mlTimeSeriesSearchService,
            mlResultsService: this.context.services.mlServices.mlResultsService,
            mlForecastService: this.mlForecastService,
            mlTimeSeriesExplorer: this.mlTimeSeriesExplorer,
            getBoundsRoundedToInterval: this.getBoundsRoundedToInterval,
          },
        }).then((result) => {
          if (result === null) {
            // Aborted or failed without a successor. A newer load increments `loadGeneration`
            // synchronously, so this must not clear that load's in-progress state.
            // Errors already report themselves. A cancel restores the previous chart; the abort
            // listener does that too, and calling it again is the same snapshot.
            const cancelled =
              contextLoadSignal.aborted && contextLoadSignal.reason !== AbortReason.REPLACED;
            if (!this.unmounted && generation === this.loadGeneration && cancelled) {
              this.revertToChartSnapshot();
            } else if (generation === this.loadGeneration) {
              this.pendingRefreshFocus = false;
            }
            return;
          }
          let focusScheduled = false;
          consumeSmvContextLoadResult({
            result,
            isUnmounted: () => this.unmounted,
            loadCounterWhenStarted: loadCounter,
            readLoadCounter: () => this.state.loadCounter,
            syncPreviousSelectedForecastIdFromProps: () => {
              this.previousSelectedForecastId = this.props.selectedForecastId;
            },
            applyZoomSelection: (range) => {
              focusScheduled = this.contextChartSelected(range, forceFocus);
              if (!focusScheduled) {
                this.pendingRefreshFocus = false;
              }
            },
            applyStatePatch: (patch) => {
              // Context can land before focus. Don't treat that half-updated chart as the
              // snapshot a cancel restores.
              const commitWhenApplied = !focusScheduled;
              this.setState({ ...fullRefreshResetPatch, ...patch }, () => {
                if (commitWhenApplied && generation === this.loadGeneration) {
                  this.commitChartSnapshot();
                }
              });
            },
            // If focus will load next, wait for applyFocusPipelinePatch before completing.
            // Otherwise complete now (empty / dataNotChartable / no zoom / skipped focus)
            // so the dashboard refresh button cannot stay on Cancel.
            afterStatePatch: (_statePatch, { hasPendingFocus }) => {
              if (!hasPendingFocus || !focusScheduled) {
                this.props.onRenderComplete?.();
              }
            },
          });
        });
      }
    );
  };

  /**
   * Updates local state of detector related controls from the global state.
   * @param callback to invoke after a state update.
   */
  getControlsForDetector = () => {
    const { selectedDetectorIndex, selectedEntities, selectedJob } = this.props;
    return getControlsForDetector(selectedDetectorIndex, selectedEntities, selectedJob);
  };

  /**
   * Updates criteria fields for API calls, e.g. getAnomaliesTableData
   * @param detectorIndex
   * @param entities
   */
  getCriteriaFields(detectorIndex, entities) {
    return buildCriteriaFields(detectorIndex, entities);
  }

  async componentDidMount() {
    this.getBoundsRoundedToInterval = timeBucketsServiceFactory(
      this.context.services.uiSettings
    ).getBoundsRoundedToInterval;

    this.mlTimeSeriesExplorer = timeSeriesExplorerServiceFactory(
      this.context.services.uiSettings,
      this.context.services.mlServices.mlApi,
      this.context.services.mlServices.mlResultsService
    );
    this.mlForecastService = forecastServiceFactory(this.context.services.mlServices.mlApi);

    // Listen for context chart updates.
    this.subscriptions.add(
      subscribeSmvBrushToFocusZoom(this.contextChart$, {
        includeAnomaliesTable: this.includeAnomaliesTable,
        isBrushFocusInitPending: () => this.contextChartSelectedInitCallDone === false,
        markBrushFocusInitHandled: () => {
          this.contextChartSelectedInitCallDone = true;
        },
        onBrushPreview: (selection) => {
          this.setState({
            zoomFrom: selection.from,
            zoomTo: selection.to,
          });
        },
        readChartZoomState: () => ({
          contextChartData: this.state.contextChartData,
          contextForecastData: this.state.contextForecastData,
          // A refresh keeps the previous focus series until the new one arrives. Treat it as
          // missing so the pipeline starts a real focus load and always reaches onRenderComplete.
          focusChartData: this.pendingRefreshFocus ? undefined : this.state.focusChartData,
          zoomFromFocusLoaded: this.state.zoomFromFocusLoaded,
          zoomToFocusLoaded: this.state.zoomToFocusLoaded,
        }),
        onFocusPipelineStarting: () => {
          this.focusSnapshotGeneration = this.loadGeneration;
          this.pendingRefreshFocus = false;
          this.props.onLoading?.(true);
          this.setState({
            loading: true,
            fullRefresh: false,
            chartDataError: undefined,
          });
        },
        getFocusAggregationInterval: (selection) => this.getFocusAggregationInterval(selection),
        getBoundsRoundedToInterval: this.getBoundsRoundedToInterval,
        getFocusData$: (selection) => {
          const { requestCancellationManager } = this.props;
          // A new brush is a user action, so it lifts an earlier cancellation. The automatic
          // focus load that follows a context load is not, so it stays cancelled.
          if (!this.autoFocusLoadPending) {
            requestCancellationManager?.resumeAfterCancellation();
          }
          this.autoFocusLoadPending = false;
          this.focusLoadSignal = requestCancellationManager?.signal;
          return this.getFocusData(selection)?.pipe(takeUntilAborted(this.focusLoadSignal));
        },
        getAnomaliesTableForRange$: (earliestMs, latestMs) =>
          this.loadAnomaliesTableData(earliestMs, latestMs).pipe(
            takeUntilAborted(this.focusLoadSignal)
          ),
        readModelPlotEnabled: () => this.state.modelPlotEnabled,
        readSelectedForecastId: () => this.props.selectedForecastId,
        applyFocusPipelinePatch: (patch) => {
          const focusGeneration = this.focusSnapshotGeneration;
          this.setState(patch, () => {
            if (focusGeneration === this.loadGeneration) {
              this.commitChartSnapshot();
            }
            this.props.onRenderComplete?.();
          });
        },
        onFocusPipelineEmpty: (selection) => {
          const focusLoadSignal = this.focusLoadSignal;
          if (focusLoadSignal?.aborted) {
            // Replaced loads belong to the successor. A cancel puts the previous chart back,
            // including context data this load already applied.
            if (
              focusLoadSignal.reason !== AbortReason.REPLACED &&
              this.focusSnapshotGeneration === this.loadGeneration
            ) {
              this.revertToChartSnapshot();
            }
            return;
          }
          // Empty focus is terminal for reporting, not an error.
          this.setState(buildSmvEmptyFocusStatePatch(selection), () => {
            if (this.focusSnapshotGeneration === this.loadGeneration) {
              this.commitChartSnapshot();
            }
            this.props.onRenderComplete?.();
          });
        },
        onFocusPipelineError: (error) => {
          // Completes reporting via onRenderComplete so deferred focus waits cannot hang.
          this.displayErrorToastMessages(error, getSmvFocusLoadErrorMessage());
        },
      })
    );

    if (this.context && this.props.selectedJob !== undefined) {
      // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
      this.context.services.mlServices.mlFieldFormatService.populateFormats([
        this.props.selectedJob.job_id,
      ]);
    }

    // Populate mlJobService to work with LinksMenuUI.
    this.mlJobService = mlJobServiceFactory(undefined, this.context.services.mlServices.mlApi);
    await this.mlJobService.loadJobsWrapper();

    this.componentDidUpdate();
  }

  componentDidUpdate(previousProps) {
    if (
      previousProps === undefined ||
      previousProps.selectedForecastId !== this.props.selectedForecastId
    ) {
      if (this.props.selectedForecastId !== undefined) {
        // Ensure the forecast data will be shown if hidden previously.
        this.setState({ showForecast: true });
        // Not best practice but we need the previous value for another comparison
        // once all the data was loaded.
        if (previousProps !== undefined) {
          this.previousSelectedForecastId = previousProps.selectedForecastId;
        }
      }
    }

    const { shouldReload, fullRefresh } = getSmvDataReloadPlan(
      previousProps === undefined ? undefined : smvReloadSnapshotFromSmvHostProps(previousProps),
      smvReloadSnapshotFromSmvHostProps(this.props)
    );
    if (shouldReload) {
      this.loadSingleMetricData(fullRefresh);
    }

    if (previousProps === undefined) {
      return;
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    this.contextLoadAbortController?.abort();
    this.subscriptions.unsubscribe();
  }

  render() {
    const {
      autoZoomDuration,
      bounds,
      chartWidth,
      chartHeight,
      lastRefresh,
      onForecastComplete,
      isInteractive,
      selectedEntities,
      selectedDetectorIndex,
      selectedJob,
      selectedJobStats,
      shouldShowForecastButton,
    } = this.props;

    const {
      chartDetails,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
      dataNotChartable,
      focusAggregationInterval,
      focusAnnotationData,
      focusChartData,
      focusForecastData,
      fullRefresh,
      hasResults,
      loading,
      modelPlotEnabled,
      showAnnotations,
      showAnnotationsCheckbox,
      showForecast,
      showForecastCheckbox,
      showModelBounds,
      showModelBoundsCheckbox,
      swimlaneData,
      tableData,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      chartDataError,
      sourceIndicesWithGeoFields,
    } = this.state;
    const chartProps = {
      modelPlotEnabled,
      contextChartData,
      contextChartSelected: this.contextChartSelected,
      contextForecastData,
      contextAggregationInterval,
      swimlaneData,
      focusAnnotationData,
      focusChartData,
      focusForecastData,
      focusAggregationInterval,
      svgWidth: chartWidth,
      svgHeight: chartHeight,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      autoZoomDuration,
      isInteractive,
    };

    const entityControls = this.getControlsForDetector();
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    const arePartitioningFieldsProvided = this.arePartitioningFieldsProvided();

    let renderFocusChartOnly = true;

    if (
      isEqual(this.previousChartProps.focusForecastData, chartProps.focusForecastData) &&
      isEqual(this.previousChartProps.focusChartData, chartProps.focusChartData) &&
      isEqual(this.previousChartProps.focusAnnotationData, chartProps.focusAnnotationData) &&
      this.previousShowForecast === showForecast &&
      this.previousShowModelBounds === showModelBounds &&
      this.props.previousRefresh === lastRefresh
    ) {
      renderFocusChartOnly = false;
    }

    this.previousChartProps = chartProps;
    this.previousShowForecast = showForecast;
    this.previousShowModelBounds = showModelBounds;
    return (
      <SingleMetricViewerChartSurface
        fieldNamesWithEmptyValues={fieldNamesWithEmptyValues}
        controlsSlot={<EuiSpacer size="m" />}
      >
        {fullRefresh && loading === true && (
          <LoadingIndicator
            label={i18n.translate('xpack.ml.timeSeriesExplorer.loadingLabel', {
              defaultMessage: 'Loading',
            })}
          />
        )}

        {loading === false && chartDataError !== undefined && (
          <TimeseriesexplorerChartDataError errorMsg={chartDataError} />
        )}

        {arePartitioningFieldsProvided &&
          selectedJob &&
          (fullRefresh === false || loading === false) &&
          hasResults === false &&
          chartDataError === undefined && (
            <TimeseriesexplorerNoChartData
              dataNotChartable={dataNotChartable}
              entities={entityControls}
            />
          )}
        {arePartitioningFieldsProvided &&
          selectedJob &&
          (fullRefresh === false || loading === false) &&
          hasResults === true && (
            <div>
              <EntityFieldNamesAndFilterButtons
                api={this.props.api}
                entityData={chartDetails.entityData}
                isInteractive={isInteractive}
              />
              <EuiFlexGroup style={{ float: 'right' }} alignItems="center">
                {isInteractive && showModelBoundsCheckbox && (
                  <TimeseriesExplorerCheckbox
                    id="toggleModelBoundsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
                      defaultMessage: 'show model bounds',
                    })}
                    checked={showModelBounds}
                    onChange={this.toggleShowModelBoundsHandler}
                  />
                )}

                {isInteractive && showAnnotationsCheckbox && (
                  <TimeseriesExplorerCheckbox
                    id="toggleAnnotationsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
                      defaultMessage: 'annotations',
                    })}
                    checked={showAnnotations}
                    onChange={this.toggleShowAnnotationsHandler}
                  />
                )}

                {isInteractive && showForecastCheckbox && (
                  <EuiFlexItem grow={false}>
                    <TimeseriesExplorerCheckbox
                      id="toggleShowForecastCheckbox"
                      label={
                        <span data-test-subj={'mlForecastCheckbox'}>
                          {i18n.translate('xpack.ml.timeSeriesExplorer.showForecastLabel', {
                            defaultMessage: 'show forecast',
                          })}
                        </span>
                      }
                      checked={showForecast}
                      onChange={this.toggleShowForecastHandler}
                    />
                  </EuiFlexItem>
                )}

                {isInteractive &&
                  arePartitioningFieldsProvided &&
                  selectedJob &&
                  shouldShowForecastButton === true && (
                    <EuiFlexItem grow={false} style={{ textAlign: 'right' }}>
                      <ForecastingModal
                        buttonMode={'empty'}
                        job={selectedJob}
                        jobState={selectedJobStats.state}
                        earliestRecordTimestamp={
                          selectedJobStats.data_counts.earliest_record_timestamp
                        }
                        latestRecordTimestamp={selectedJobStats.data_counts.latest_record_timestamp}
                        detectorIndex={selectedDetectorIndex}
                        entities={entityControls}
                        setForecastId={this.setForecastId}
                        className="forecast-controls"
                        onForecastComplete={onForecastComplete}
                        selectedForecastId={this.props.selectedForecastId}
                      />
                    </EuiFlexItem>
                  )}
              </EuiFlexGroup>

              <TimeSeriesChartWithTooltips
                chartProps={chartProps}
                contextAggregationInterval={contextAggregationInterval}
                bounds={bounds}
                detectorIndex={selectedDetectorIndex}
                embeddableMode
                renderFocusChartOnly={renderFocusChartOnly}
                selectedJob={selectedJob}
                selectedEntities={selectedEntities}
                showAnnotations={showAnnotations}
                showForecast={showForecast}
                showModelBounds={showModelBounds}
                lastRefresh={lastRefresh}
                tableData={tableData}
                sourceIndicesWithGeoFields={sourceIndicesWithGeoFields}
                telemetrySource={'embeddable_single_metric_viewer_chart'}
                requestCancellationManager={this.props.requestCancellationManager}
              />
            </div>
          )}
      </SingleMetricViewerChartSurface>
    );
  }
}
