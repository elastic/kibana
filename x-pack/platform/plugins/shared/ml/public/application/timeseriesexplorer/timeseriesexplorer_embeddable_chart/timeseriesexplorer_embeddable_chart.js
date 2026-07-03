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

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';
import { ForecastingModal } from '../components/forecasting_modal/forecasting_modal';
import { TimeseriesexplorerNoChartData } from '../components/timeseriesexplorer_no_chart_data';

import {
  APP_STATE_ACTION,
  CHARTS_POINT_TARGET,
  TIME_FIELD_NAME,
} from '../timeseriesexplorer_constants';
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
  getModelPlotEnabledForDetector,
  getSmvContextLoadErrorMessages,
  getSmvDataReloadPlan,
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
    onRenderComplete: PropTypes.func,
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
      TIME_FIELD_NAME
    );
  }

  contextChartSelected = (selection) => {
    const zoomState = {
      from: selection.from.toISOString(),
      to: selection.to.toISOString(),
    };

    if (
      isEqual(this.props.zoom, zoomState) &&
      this.state.focusChartData !== undefined &&
      this.props.previousRefresh === this.props.lastRefresh
    ) {
      return;
    }

    this.contextChart$.next(selection);
    this.props.appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);
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

  displayErrorToastMessages = (error, errorMsg) => {
    if (this.props.toastNotificationService) {
      this.props.toastNotificationService.displayErrorToast(error, errorMsg, 2000);
    }
    this.setState({ loading: false, chartDataError: errorMsg });
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

    this.contextLoadAbortController?.abort();
    this.contextLoadAbortController = new AbortController();
    const contextLoadSignal = this.contextLoadAbortController.signal;

    this.contextChartSelectedInitCallDone = false;

    // Only when `fullRefresh` is true we'll reset all data
    // and show the loading spinner within the page.
    const entityControls = this.getControlsForDetector();
    this.setState(
      {
        fullRefresh,
        loadCounter: currentLoadCounter + 1,
        loading: true,
        chartDataError: undefined,
        ...(fullRefresh
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
          : {}),
      },
      () => {
        const { loadCounter, modelPlotEnabled } = this.state;
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
          displayError: (error, message) => this.displayErrorToastMessages(error, message),
          errorMessages: getSmvContextLoadErrorMessages(this.props.selectedForecastId),
          deps: {
            mlTimeSeriesSearchService: this.context.services.mlServices.mlTimeSeriesSearchService,
            mlResultsService: this.context.services.mlServices.mlResultsService,
            mlForecastService: this.mlForecastService,
            mlTimeSeriesExplorer: this.mlTimeSeriesExplorer,
            getBoundsRoundedToInterval: this.getBoundsRoundedToInterval,
          },
        }).then((result) => {
          consumeSmvContextLoadResult({
            result,
            isUnmounted: () => this.unmounted,
            loadCounterWhenStarted: loadCounter,
            readLoadCounter: () => this.state.loadCounter,
            syncPreviousSelectedForecastIdFromProps: () => {
              this.previousSelectedForecastId = this.props.selectedForecastId;
            },
            applyZoomSelection: (range) => this.contextChartSelected(range),
            applyStatePatch: (patch) => this.setState(patch),
            afterStatePatch: (statePatch) => {
              if (
                statePatch.dataNotChartable !== true &&
                this.props.onRenderComplete !== undefined
              ) {
                this.props.onRenderComplete();
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
          focusChartData: this.state.focusChartData,
          zoomFromFocusLoaded: this.state.zoomFromFocusLoaded,
          zoomToFocusLoaded: this.state.zoomToFocusLoaded,
        }),
        onFocusPipelineStarting: () => {
          this.setState({
            loading: true,
            fullRefresh: false,
          });
        },
        getFocusAggregationInterval: (selection) => this.getFocusAggregationInterval(selection),
        getBoundsRoundedToInterval: this.getBoundsRoundedToInterval,
        getFocusData$: (selection) => this.getFocusData(selection),
        getAnomaliesTableForRange$: (earliestMs, latestMs) =>
          this.loadAnomaliesTableData(earliestMs, latestMs),
        readModelPlotEnabled: () => this.state.modelPlotEnabled,
        readSelectedForecastId: () => this.props.selectedForecastId,
        applyFocusPipelinePatch: (patch) => this.setState(patch),
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
    this.contextLoadAbortController?.abort();
    this.subscriptions.unsubscribe();
    this.unmounted = true;
  }

  render() {
    const {
      autoZoomDuration,
      bounds,
      chartWidth,
      chartHeight,
      lastRefresh,
      onForecastComplete,
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
              />
              <EuiFlexGroup style={{ float: 'right' }} alignItems="center">
                {showModelBoundsCheckbox && (
                  <TimeseriesExplorerCheckbox
                    id="toggleModelBoundsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
                      defaultMessage: 'show model bounds',
                    })}
                    checked={showModelBounds}
                    onChange={this.toggleShowModelBoundsHandler}
                  />
                )}

                {showAnnotationsCheckbox && (
                  <TimeseriesExplorerCheckbox
                    id="toggleAnnotationsCheckbox"
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
                      defaultMessage: 'annotations',
                    })}
                    checked={showAnnotations}
                    onChange={this.toggleShowAnnotationsHandler}
                  />
                )}

                {showForecastCheckbox && (
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

                {arePartitioningFieldsProvided &&
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
              />
            </div>
          )}
      </SingleMetricViewerChartSurface>
    );
  }
}
