/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import { find, isEqual } from 'lodash';
import moment from 'moment-timezone';
import { Subject, Subscription } from 'rxjs';
import PropTypes from 'prop-types';
import React, { createRef, Fragment } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiAccordion,
  EuiBadge,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { context } from '@kbn/kibana-react-plugin/public';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';

import { isTimeSeriesViewJob } from '../../../common/util/job_utils';

import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectSeverity } from '../components/controls/select_severity';
import { forecastServiceFactory } from '../services/forecast_service';
import { timeSeriesExplorerServiceFactory } from '../util/time_series_explorer_service';
import { mlJobServiceFactory } from '../services/job_service';
import { mlResultsServiceProvider } from '../services/results_service';
import { toastNotificationServiceProvider } from '../services/toast_notification_service';

import { TimeseriesexplorerNoChartData } from './components/timeseriesexplorer_no_chart_data';
import { TimeSeriesExplorerPage } from './timeseriesexplorer_page';
import { TimeSeriesExplorerHelpPopover } from './timeseriesexplorer_help_popover';

import {
  APP_STATE_ACTION,
  CHARTS_POINT_TARGET,
  TIME_FIELD_NAME,
} from './timeseriesexplorer_constants';
import { timeSeriesSearchServiceFactory } from './timeseriesexplorer_utils/time_series_search_service';
import { getTimeseriesexplorerDefaultState } from './timeseriesexplorer_utils';
import { ANOMALY_DETECTION_DEFAULT_TIME_RANGE } from '../../../common/constants/settings';
import { getControlsForDetector } from './get_controls_for_detector';
import { SeriesControls } from './components/series_controls';
import { TimeSeriesChartWithTooltips } from './components/timeseries_chart/timeseries_chart_with_tooltip';
import { aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import { isMetricDetector } from './get_function_description';
import { getViewableDetectors } from './timeseriesexplorer_utils/get_viewable_detectors';
import { TimeseriesexplorerChartDataError } from './components/timeseriesexplorer_chart_data_error';
import { AnomalyDetectionNoJobsSelected } from '../components/anomaly_detection_no_jobs_selected';
import { getDataViewsAndIndicesWithGeoFields } from '../explorer/explorer_utils';
import { indexServiceFactory } from '../util/index_service';
import { timeBucketsServiceFactory } from '../util/time_buckets_service';
import { TimeSeriesExplorerControls } from './components/timeseriesexplorer_controls';
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
} from './timeseriesexplorer_chart_controller';

// Used to indicate the chart is being plotted across
// all partition field values, where the cardinality of the field cannot be
// obtained as it is not aggregatable e.g. 'all distinct kpi_indicator values'
const allValuesLabel = i18n.translate('xpack.ml.timeSeriesExplorer.allPartitionValuesLabel', {
  defaultMessage: 'all',
});

const containerPadding = 34;

export class TimeSeriesExplorer extends React.Component {
  /**
   * Access ML services in react context.
   */
  static contextType = context;

  static propTypes = {
    appStateHandler: PropTypes.func.isRequired,
    autoZoomDuration: PropTypes.number.isRequired,
    bounds: PropTypes.object.isRequired,
    dateFormatTz: PropTypes.string.isRequired,
    lastRefresh: PropTypes.number.isRequired,
    previousRefresh: PropTypes.number,
    selectedJobId: PropTypes.string.isRequired,
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.object,
    zoom: PropTypes.object,
    handleJobSelectionChange: PropTypes.func,
  };

  state = getTimeseriesexplorerDefaultState();

  subscriptions = new Subscription();

  resizeRef = createRef();
  resizeChecker = undefined;
  resizeHandler = () => {
    this.setState({
      svgWidth:
        this.resizeRef.current !== null ? this.resizeRef.current.offsetWidth - containerPadding : 0,
    });
  };
  unmounted = false;

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject();

  /**
   * When false, skips anomalies table fetches (zoom pipeline + interval/severity reload).
   * Reserved for future embed-style hosts; SMV page keeps default true.
   */
  includeAnomaliesTable = true;

  dataViewsService;
  toastNotificationService;
  mlApi;
  mlForecastService;
  mlIndexUtils;
  mlJobService;
  mlResultsService;
  mlTimeSeriesExplorer;
  mlTimeSeriesSearchService;
  getBoundsRoundedToInterval;
  contextLoadAbortController;

  constructor(props, constructorContext) {
    super(props, constructorContext);
    this.dataViewsService = constructorContext.services.data.dataViews;
    this.toastNotificationService = toastNotificationServiceProvider(
      constructorContext.services.notifications.toasts
    );
    this.mlApi = constructorContext.services.mlServices.mlApi;
    this.mlForecastService = forecastServiceFactory(this.mlApi);
    this.mlIndexUtils = indexServiceFactory(this.dataViewsService);
    this.mlJobService = mlJobServiceFactory(this.mlApi);
    this.mlResultsService = mlResultsServiceProvider(this.mlApi);
    this.mlTimeSeriesExplorer = timeSeriesExplorerServiceFactory(
      constructorContext.services.uiSettings,
      this.mlApi,
      this.mlResultsService
    );
    this.mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(
      this.mlResultsService,
      this.mlApi
    );
    this.getBoundsRoundedToInterval = timeBucketsServiceFactory(
      constructorContext.services.uiSettings
    ).getBoundsRoundedToInterval;
  }

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
    const { selectedJobId } = this.props;
    const selectedJob = this.mlJobService.getJob(selectedJobId);

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
    const { selectedJobId, selectedForecastId, selectedDetectorIndex, functionDescription } =
      this.props;
    const { modelPlotEnabled } = this.state;
    const selectedJob = this.mlJobService.getJob(selectedJobId);
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
      selectedJobId,
      tableInterval,
      tableSeverity,
      functionDescription,
    } = this.props;
    const mlJobService = this.mlJobService;
    const selectedJob = mlJobService.getJob(selectedJobId);
    const entityControls = this.getControlsForDetector();

    return fetchAnomaliesTableData$({
      mlApi: this.mlApi,
      jobId: selectedJob.job_id,
      criteriaFields: this.getCriteriaFields(selectedDetectorIndex, entityControls),
      tableInterval,
      tableSeverity,
      earliestMs,
      latestMs,
      dateFormatTz,
      functionDescription,
      enrichment: {
        source: 'jobService',
        detectorsByJob: mlJobService.detectorsByJob,
        customUrlsByJob: mlJobService.customUrlsByJob,
      },
    });
  };

  setForecastId = (forecastId) => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FORECAST_ID, forecastId);
  };

  displayErrorToastMessages = (error, errorMsg) => {
    if (this.toastNotificationService) {
      this.toastNotificationService.displayErrorToast(error, errorMsg, 2000);
    }
    this.setState({ loading: false, chartDataError: errorMsg });
  };

  loadSingleMetricData = (fullRefresh = true) => {
    const mlJobService = this.mlJobService;
    const {
      autoZoomDuration,
      bounds,
      selectedDetectorIndex,
      selectedJobId,
      zoom,
      functionDescription,
    } = this.props;

    const { loadCounter: currentLoadCounter } = this.state;

    const currentSelectedJob = mlJobService.getJob(selectedJobId);
    if (currentSelectedJob === undefined) {
      return;
    }
    if (
      isMetricDetector(currentSelectedJob, selectedDetectorIndex) &&
      functionDescription === undefined
    ) {
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
                currentSelectedJob,
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

        const selectedJob = mlJobService.getJob(selectedJobId);
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
            mlTimeSeriesSearchService: this.mlTimeSeriesSearchService,
            mlResultsService: this.mlResultsService,
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
    const { selectedDetectorIndex, selectedEntities, selectedJobId } = this.props;
    const selectedJob = this.mlJobService.getJob(selectedJobId);
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

  loadForJobId(jobId) {
    const { appStateHandler, selectedDetectorIndex } = this.props;

    const selectedJob = this.mlJobService.getJob(jobId);

    if (selectedJob === undefined) {
      return;
    }

    const detectors = getViewableDetectors(selectedJob);

    // Check the supplied index is valid.
    const appStateDtrIdx = selectedDetectorIndex;
    let detectorIndex = appStateDtrIdx !== undefined ? appStateDtrIdx : detectors[0].index;
    if (find(detectors, { index: detectorIndex }) === undefined) {
      const warningText = i18n.translate(
        'xpack.ml.timeSeriesExplorer.requestedDetectorIndexNotValidWarningMessage',
        {
          defaultMessage: 'Requested detector index {detectorIndex} is not valid for job {jobId}',
          values: {
            detectorIndex,
            jobId: selectedJob.job_id,
          },
        }
      );
      if (this.toastNotificationService) {
        this.toastNotificationService.displayWarningToast(warningText);
      }

      detectorIndex = detectors[0].index;
    }

    const detectorId = detectorIndex;

    if (detectorId !== selectedDetectorIndex) {
      appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, detectorId);
    }
    // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
    this.context.services.mlServices.mlFieldFormatService.populateFormats([jobId]);
  }

  componentDidMount() {
    // if timeRange used in the url is incorrect
    // perhaps due to user's advanced setting using incorrect date-maths
    const { invalidTimeRangeError } = this.props;
    if (invalidTimeRangeError) {
      if (this.toastNotificationService) {
        this.toastNotificationService.displayWarningToast(
          i18n.translate('xpack.ml.timeSeriesExplorer.invalidTimeRangeInUrlCallout', {
            defaultMessage:
              'The time filter was changed to the full range for this job due to an invalid default time filter. Check the advanced settings for {field}.',
            values: {
              field: ANOMALY_DETECTION_DEFAULT_TIME_RANGE,
            },
          })
        );
      }
    }
    // Required to redraw the time series chart when the container is resized.
    this.resizeChecker = new ResizeChecker(this.resizeRef.current);
    this.resizeChecker.on('resize', () => {
      this.resizeHandler();
    });
    this.resizeHandler();

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

    this.componentDidUpdate();
  }

  componentDidUpdate(previousProps) {
    if (previousProps === undefined || previousProps.selectedJobId !== this.props.selectedJobId) {
      const selectedJob = this.mlJobService.getJob(this.props.selectedJobId);
      const jobIdForGeoFetch = this.props.selectedJobId;
      this.contextChartSelectedInitCallDone = false;
      getDataViewsAndIndicesWithGeoFields([selectedJob], this.dataViewsService, this.mlIndexUtils)
        .then(({ sourceIndicesWithGeoFieldsMap }) => {
          if (this.unmounted || jobIdForGeoFetch !== this.props.selectedJobId) {
            return;
          }
          this.setState(
            {
              fullRefresh: false,
              loading: true,
              sourceIndicesWithGeoFields: sourceIndicesWithGeoFieldsMap,
            },
            () => {
              this.loadForJobId(this.props.selectedJobId);
            }
          );
        })
        .catch(console.error); // eslint-disable-line no-console
    }

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

    // Reload the anomalies table if the Interval or Threshold controls are changed.
    const tableControlsListener = () => {
      if (this.includeAnomaliesTable === false) {
        return;
      }
      const { zoomFrom, zoomTo } = this.state;
      if (zoomFrom !== undefined && zoomTo !== undefined) {
        this.loadAnomaliesTableData(zoomFrom.getTime(), zoomTo.getTime()).subscribe((res) =>
          this.setState(res)
        );
      }
    };

    if (
      previousProps.tableInterval !== this.props.tableInterval ||
      previousProps.tableSeverity !== this.props.tableSeverity
    ) {
      tableControlsListener();
    }
  }

  componentWillUnmount() {
    this.contextLoadAbortController?.abort();
    this.subscriptions.unsubscribe();
    this.resizeChecker.destroy();
    this.unmounted = true;
  }

  render() {
    const mlJobService = this.mlJobService;
    const {
      autoZoomDuration,
      bounds,
      dateFormatTz,
      lastRefresh,
      selectedDetectorIndex,
      selectedEntities,
      selectedJobId,
    } = this.props;

    const {
      chartDetails,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
      dataNotChartable,
      focusAggregationInterval,
      focusAnnotationError,
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
      svgWidth,
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
      svgWidth,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      autoZoomDuration,
    };
    const jobs = mlJobService.jobs.filter(isTimeSeriesViewJob);

    if (selectedDetectorIndex === undefined || mlJobService.getJob(selectedJobId) === undefined) {
      return (
        <TimeSeriesExplorerPage
          handleJobSelectionChange={this.props.handleJobSelectionChange}
          dateFormatTz={dateFormatTz}
          resizeRef={this.resizeRef}
        >
          <AnomalyDetectionNoJobsSelected />
        </TimeSeriesExplorerPage>
      );
    }

    const selectedJob = mlJobService.getJob(selectedJobId);
    const entityControls = this.getControlsForDetector();
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    const arePartitioningFieldsProvided = this.arePartitioningFieldsProvided();
    const detectors = getViewableDetectors(selectedJob);

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
      <TimeSeriesExplorerPage
        dateFormatTz={dateFormatTz}
        resizeRef={this.resizeRef}
        handleJobSelectionChange={this.props.handleJobSelectionChange}
        selectedJobId={[selectedJobId]}
      >
        <SingleMetricViewerChartSurface fieldNamesWithEmptyValues={fieldNamesWithEmptyValues}>
          <SeriesControls
            selectedJobId={selectedJobId}
            appStateHandler={this.props.appStateHandler}
            selectedDetectorIndex={selectedDetectorIndex}
            selectedEntities={this.props.selectedEntities}
            bounds={bounds}
            functionDescription={this.props.functionDescription}
            setFunctionDescription={this.setFunctionDescription}
          >
            {arePartitioningFieldsProvided && (
              <EuiFlexItem>
                <TimeSeriesExplorerControls
                  forecastId={this.props.selectedForecastId}
                  selectedDetectorIndex={selectedDetectorIndex}
                  selectedEntities={selectedEntities}
                  selectedJob={selectedJob}
                  showAnnotationsCheckbox={showAnnotationsCheckbox}
                  showAnnotations={showAnnotations}
                  showForecastCheckbox={showForecastCheckbox}
                  showForecast={showForecast}
                  showModelBoundsCheckbox={showModelBoundsCheckbox}
                  showModelBounds={showModelBounds}
                  onShowModelBoundsChange={this.toggleShowModelBoundsHandler}
                  onShowAnnotationsChange={this.toggleShowAnnotationsHandler}
                  onShowForecastChange={this.toggleShowForecastHandler}
                  fullRefresh={fullRefresh}
                  loading={loading}
                  hasResults={hasResults}
                  setForecastId={this.setForecastId}
                  entities={entityControls}
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  // It seems like props below can be easily extracted from the selectedJob
                  // However, it seems like we are losing sync at some point and they need to be passed directly
                  jobState={selectedJob.state}
                  earliestRecordTimestamp={selectedJob.data_counts.earliest_record_timestamp}
                  latestRecordTimestamp={selectedJob.data_counts.latest_record_timestamp}
                />
              </EuiFlexItem>
            )}
          </SeriesControls>
          <EuiSpacer size="m" />

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
            jobs.length > 0 &&
            (fullRefresh === false || loading === false) &&
            hasResults === false &&
            chartDataError === undefined && (
              <TimeseriesexplorerNoChartData
                dataNotChartable={dataNotChartable}
                entities={entityControls}
              />
            )}
          {arePartitioningFieldsProvided &&
            jobs.length > 0 &&
            (fullRefresh === false || loading === false) &&
            hasResults === true && (
              <div>
                <EuiFlexGroup gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size={'xs'}>
                      <h2>
                        <span>
                          {i18n.translate(
                            'xpack.ml.timeSeriesExplorer.singleTimeSeriesAnalysisTitle',
                            {
                              defaultMessage: 'Single time series analysis of {functionLabel}',
                              values: { functionLabel: chartDetails.functionLabel },
                            }
                          )}
                        </span>
                        &nbsp;
                        {chartDetails.entityData.count === 1 &&
                          chartDetails.entityData.entities.length > 0 && (
                            <EuiTextColor color="accentSecondary" size="s" component="span">
                              (
                              {chartDetails.entityData.entities
                                .map((entity) => {
                                  return `${entity.fieldName}: ${entity.fieldValue}`;
                                })
                                .join(', ')}
                              )
                            </EuiTextColor>
                          )}
                        {chartDetails.entityData.count > 1 && (
                          <EuiTextColor color="accentSecondary" size="s" component="span">
                            {chartDetails.entityData.entities.map((countData, i) => {
                              return (
                                <Fragment key={countData.fieldName}>
                                  {i18n.translate(
                                    'xpack.ml.timeSeriesExplorer.countDataInChartDetailsDescription',
                                    {
                                      defaultMessage:
                                        '{openBrace}{cardinalityValue} distinct {fieldName} {cardinality, plural, one {} other { values}}{closeBrace}',
                                      values: {
                                        openBrace: i === 0 ? '(' : '',
                                        closeBrace:
                                          i === chartDetails.entityData.entities.length - 1
                                            ? ')'
                                            : '',
                                        cardinalityValue:
                                          countData.cardinality === 0
                                            ? allValuesLabel
                                            : countData.cardinality,
                                        cardinality: countData.cardinality,
                                        fieldName: countData.fieldName,
                                      },
                                    }
                                  )}
                                  {i !== chartDetails.entityData.entities.length - 1 ? ', ' : ''}
                                </Fragment>
                              );
                            })}
                          </EuiTextColor>
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <TimeSeriesExplorerHelpPopover />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <TimeSeriesChartWithTooltips
                  chartProps={chartProps}
                  contextAggregationInterval={contextAggregationInterval}
                  bounds={bounds}
                  detectorIndex={selectedDetectorIndex}
                  renderFocusChartOnly={renderFocusChartOnly}
                  selectedJob={selectedJob}
                  selectedEntities={this.props.selectedEntities}
                  showAnnotations={showAnnotations}
                  showForecast={showForecast}
                  showModelBounds={showModelBounds}
                  lastRefresh={lastRefresh}
                  tableData={tableData}
                  sourceIndicesWithGeoFields={sourceIndicesWithGeoFields}
                  telemetrySource={'single_metric_viewer_chart'}
                />
                {focusAnnotationError !== undefined && (
                  <>
                    <EuiTitle data-test-subj="mlAnomalyExplorerAnnotations error" size={'xs'}>
                      <h2>
                        <FormattedMessage
                          id="xpack.ml.timeSeriesExplorer.annotationsErrorTitle"
                          defaultMessage="Annotations"
                        />
                      </h2>
                    </EuiTitle>
                    <EuiPanel>
                      <EuiCallOut
                        announceOnMount
                        title={i18n.translate(
                          'xpack.ml.timeSeriesExplorer.annotationsErrorCallOutTitle',
                          {
                            defaultMessage: 'An error occurred loading annotations:',
                          }
                        )}
                        color="danger"
                        iconType="warning"
                      >
                        <p>{focusAnnotationError}</p>
                      </EuiCallOut>
                    </EuiPanel>
                    <EuiSpacer size="m" />
                  </>
                )}
                {focusAnnotationData && focusAnnotationData.length > 0 && (
                  <>
                    <EuiAccordion
                      id={'mlAnnotationsAccordion'}
                      buttonContent={
                        <EuiTitle size={'xs'}>
                          <h2>
                            <FormattedMessage
                              id="xpack.ml.timeSeriesExplorer.annotationsTitle"
                              defaultMessage="Annotations {badge}"
                              values={{
                                badge: (
                                  <EuiBadge color={'hollow'}>
                                    <FormattedMessage
                                      id="xpack.ml.explorer.annotationsTitleTotalCount"
                                      defaultMessage="Total: {count}"
                                      values={{ count: focusAnnotationData.length }}
                                    />
                                  </EuiBadge>
                                ),
                              }}
                            />
                          </h2>
                        </EuiTitle>
                      }
                      data-test-subj="mlAnomalyExplorerAnnotations loaded"
                    >
                      <AnnotationsTable
                        chartDetails={chartDetails}
                        detectorIndex={selectedDetectorIndex}
                        detectors={detectors}
                        jobIds={[this.props.selectedJobId]}
                        annotations={focusAnnotationData}
                        isSingleMetricViewerLinkVisible={false}
                        isNumberBadgeVisible={true}
                      />
                    </EuiAccordion>
                    <EuiSpacer size="m" />
                  </>
                )}
                <AnnotationFlyout
                  chartDetails={chartDetails}
                  detectorIndex={selectedDetectorIndex}
                  detectors={detectors}
                />
                <EuiTitle size={'xs'}>
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.timeSeriesExplorer.anomaliesTitle"
                      defaultMessage="Anomalies"
                    />
                  </h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup direction="row" gutterSize="l" responsive={true}>
                  <EuiFlexItem grow={false}>
                    <SelectSeverity />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <SelectInterval />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
              </div>
            )}
          {arePartitioningFieldsProvided &&
            jobs.length > 0 &&
            hasResults === true &&
            tableData?.anomalies && (
              <AnomaliesTable
                bounds={bounds}
                tableData={tableData}
                filter={this.tableFilter}
                sourceIndicesWithGeoFields={this.state.sourceIndicesWithGeoFields}
                selectedJobs={[
                  {
                    id: selectedJob.job_id,
                    modelPlotEnabled,
                  },
                ]}
                telemetrySource="single_metric_viewer_anomalies_table"
              />
            )}
        </SingleMetricViewerChartSurface>
      </TimeSeriesExplorerPage>
    );
  }
}
