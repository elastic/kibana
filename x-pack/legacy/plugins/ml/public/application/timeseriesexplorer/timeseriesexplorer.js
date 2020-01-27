/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import { chain, difference, each, find, first, get, has, isEqual, without } from 'lodash';
import moment from 'moment-timezone';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { map, debounceTime, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import PropTypes from 'prop-types';
import React, { createRef, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { ResizeChecker } from '../../../../../../../src/plugins/kibana_utils/public';

import { ANOMALIES_TABLE_DEFAULT_QUERY_SIZE } from '../../../common/constants/search';
import { parseInterval } from '../../../common/util/parse_interval';
import {
  isModelPlotEnabled,
  isSourceDataChartableForDetector,
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  mlFunctionToESAggregation,
} from '../../../common/util/job_utils';

import { ChartTooltip } from '../components/chart_tooltip';
import {
  jobSelectServiceFactory,
  setGlobalState,
  getSelectedJobIds,
} from '../components/job_selector/job_select_service_utils';
import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { EntityControl } from './components/entity_control';
import { ForecastingModal } from './components/forecasting_modal/forecasting_modal';
import { JobSelector } from '../components/job_selector';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { NavigationMenu } from '../components/navigation_menu';
import { severity$, SelectSeverity } from '../components/controls/select_severity/select_severity';
import { interval$, SelectInterval } from '../components/controls/select_interval/select_interval';
import { TimeseriesChart } from './components/timeseries_chart/timeseries_chart';
import { TimeseriesexplorerNoJobsFound } from './components/timeseriesexplorer_no_jobs_found';
import { TimeseriesexplorerNoChartData } from './components/timeseriesexplorer_no_chart_data';

import { annotationsRefresh$ } from '../services/annotations_service';
import { ml } from '../services/ml_api_service';
import { mlFieldFormatService } from '../services/field_format_service';
import { mlForecastService } from '../services/forecast_service';
import { mlJobService } from '../services/job_service';
import { mlResultsService } from '../services/results_service';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

import { getBoundsRoundedToInterval } from '../util/time_buckets';

import {
  APP_STATE_ACTION,
  CHARTS_POINT_TARGET,
  TIME_FIELD_NAME,
} from './timeseriesexplorer_constants';
import { mlTimeSeriesSearchService } from './timeseries_search_service';
import {
  calculateAggregationInterval,
  calculateDefaultFocusRange,
  calculateInitialFocusRange,
  createTimeSeriesJobData,
  getAutoZoomDuration,
  processForecastResults,
  processMetricPlotResults,
  processRecordScoreResults,
  getFocusData,
} from './timeseriesexplorer_utils';

const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

// Used to indicate the chart is being plotted across
// all partition field values, where the cardinality of the field cannot be
// obtained as it is not aggregatable e.g. 'all distinct kpi_indicator values'
const allValuesLabel = i18n.translate('xpack.ml.timeSeriesExplorer.allPartitionValuesLabel', {
  defaultMessage: 'all',
});

function getTimeseriesexplorerDefaultState() {
  return {
    chartDetails: undefined,
    contextChartData: undefined,
    contextForecastData: undefined,
    // Not chartable if e.g. model plot with terms for a varp detector
    dataNotChartable: false,
    detectorId: undefined,
    detectors: [],
    entities: [],
    focusAnnotationData: [],
    focusChartData: undefined,
    focusForecastData: undefined,
    fullRefresh: true,
    hasResults: false,
    jobs: [],
    // Counter to keep track of what data sets have been loaded.
    loadCounter: 0,
    loading: false,
    modelPlotEnabled: false,
    selectedJob: undefined,
    // Toggles display of annotations in the focus chart
    showAnnotations: mlAnnotationsEnabled,
    showAnnotationsCheckbox: mlAnnotationsEnabled,
    // Toggles display of forecast data in the focus chart
    showForecast: true,
    showForecastCheckbox: false,
    showModelBoundsCheckbox: false,
    svgWidth: 0,
    tableData: undefined,
    zoomFrom: undefined,
    zoomTo: undefined,
    zoomFromFocusLoaded: undefined,
    zoomToFocusLoaded: undefined,

    // Toggles display of model bounds in the focus chart
    showModelBounds: true,
  };
}

const TimeSeriesExplorerPage = ({ children, jobSelectorProps, loading, resizeRef }) => (
  <Fragment>
    <NavigationMenu tabId="timeseriesexplorer" />
    {/* Show animated progress bar while loading */}
    {loading && <EuiProgress className="mlTimeSeriesExplorerProgress" color="primary" size="xs" />}
    {/* Show a progress bar with progress 0% when not loading.
        If we'd just show no progress bar when not loading it would result in a flickering height effect. */}
    {!loading && (
      <EuiProgress
        className="mlTimeSeriesExplorerProgress"
        value={0}
        max={100}
        color="primary"
        size="xs"
      />
    )}
    <JobSelector {...jobSelectorProps} />
    <div
      className="ml-time-series-explorer"
      ref={resizeRef}
      data-test-subj="mlPageSingleMetricViewer"
    >
      {children}
    </div>
  </Fragment>
);

const containerPadding = 24;

export class TimeSeriesExplorer extends React.Component {
  static propTypes = {
    appStateHandler: PropTypes.func.isRequired,
    dateFormatTz: PropTypes.string.isRequired,
    globalState: PropTypes.object.isRequired,
    timefilter: PropTypes.object.isRequired,
  };

  state = getTimeseriesexplorerDefaultState();

  subscriptions = new Subscription();

  _criteriaFields = null;

  constructor(props) {
    super(props);
    const { jobSelectService$, unsubscribeFromGlobalState } = jobSelectServiceFactory(
      props.globalState
    );
    this.jobSelectService$ = jobSelectService$;
    this.unsubscribeFromGlobalState = unsubscribeFromGlobalState;
  }

  resizeRef = createRef();
  resizeChecker = undefined;
  resizeHandler = () => {
    this.setState({
      svgWidth:
        this.resizeRef.current !== null ? this.resizeRef.current.offsetWidth - containerPadding : 0,
    });
  };

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject();

  detectorIndexChangeHandler = e => {
    const id = e.target.value;
    if (id !== undefined) {
      this.setState({ detectorId: id }, () => {
        this.updateControlsForDetector(() =>
          this.loadEntityValues(() => this.saveSeriesPropertiesAndRefresh())
        );
      });
    }
  };

  toggleShowAnnotationsHandler = () => {
    if (mlAnnotationsEnabled) {
      this.setState(prevState => ({
        showAnnotations: !prevState.showAnnotations,
      }));
    }
  };

  toggleShowForecastHandler = () => {
    this.setState(prevState => ({
      showForecast: !prevState.showForecast,
    }));
  };

  toggleShowModelBoundsHandler = () => {
    this.setState({
      showModelBounds: !this.state.showModelBounds,
    });
  };

  previousChartProps = {};
  previousShowAnnotations = undefined;
  previousShowForecast = undefined;
  previousShowModelBounds = undefined;

  tableFilter = (field, value, operator) => {
    const { entities } = this.state;
    const entity = entities.find(({ fieldName }) => fieldName === field);

    if (entity === undefined) {
      return;
    }

    const { appStateHandler } = this.props;

    let resultValue = '';
    if (operator === '+' && entity.fieldValue !== value) {
      resultValue = value;
    } else if (operator === '-' && entity.fieldValue === value) {
      resultValue = '';
    } else {
      return;
    }

    const resultEntities = {
      ...entities.reduce((appStateEntities, appStateEntity) => {
        appStateEntities[appStateEntity.fieldName] = appStateEntity.fieldValue;
        return appStateEntities;
      }, {}),
      [entity.fieldName]: resultValue,
    };

    appStateHandler(APP_STATE_ACTION.SET_ENTITIES, resultEntities);

    this.updateControlsForDetector(() => {
      this.refresh();
    });
  };

  contextChartSelectedInitCallDone = false;

  /**
   * Gets default range from component state.
   */
  getDefaultRangeFromState() {
    const {
      autoZoomDuration,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
    } = this.state;

    return calculateDefaultFocusRange(
      autoZoomDuration,
      contextAggregationInterval,
      contextChartData,
      contextForecastData
    );
  }

  getFocusAggregationInterval(selection) {
    const { jobs, selectedJob } = this.state;

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, jobs, selectedJob);
  }

  /**
   * Gets focus data for the current component state/
   */
  getFocusData(selection) {
    const { detectorId, entities, modelPlotEnabled, selectedJob } = this.state;

    const { appStateHandler } = this.props;

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    const focusAggregationInterval = this.getFocusAggregationInterval(selection);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);

    return getFocusData(
      this._criteriaFields,
      +detectorId,
      focusAggregationInterval,
      appStateHandler(APP_STATE_ACTION.GET_FORECAST_ID),
      modelPlotEnabled,
      entities.filter(entity => entity.fieldValue.length > 0),
      searchBounds,
      selectedJob,
      TIME_FIELD_NAME
    );
  }

  contextChartSelected = selection => {
    this.contextChart$.next(selection);
  };

  entityFieldValueChanged = (entity, fieldValue) => {
    const { appStateHandler } = this.props;
    const { entities } = this.state;

    const resultEntities = {
      ...entities.reduce((appStateEntities, appStateEntity) => {
        appStateEntities[appStateEntity.fieldName] = appStateEntity.fieldValue;
        return appStateEntities;
      }, {}),
      [entity.fieldName]: fieldValue,
    };

    appStateHandler(APP_STATE_ACTION.SET_ENTITIES, resultEntities);

    this.updateControlsForDetector(() => {
      this.refresh();
    });
  };

  loadAnomaliesTableData = (earliestMs, latestMs) => {
    const { dateFormatTz } = this.props;
    const { selectedJob } = this.state;

    return ml.results
      .getAnomaliesTableData(
        [selectedJob.job_id],
        this._criteriaFields,
        [],
        interval$.getValue().val,
        severity$.getValue().val,
        earliestMs,
        latestMs,
        dateFormatTz,
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
      )
      .pipe(
        map(resp => {
          const anomalies = resp.anomalies;
          const detectorsByJob = mlJobService.detectorsByJob;
          anomalies.forEach(anomaly => {
            // Add a detector property to each anomaly.
            // Default to functionDescription if no description available.
            // TODO - when job_service is moved server_side, move this to server endpoint.
            const jobId = anomaly.jobId;
            const detector = get(detectorsByJob, [jobId, anomaly.detectorIndex]);
            anomaly.detector = get(
              detector,
              ['detector_description'],
              anomaly.source.function_description
            );

            // For detectors with rules, add a property with the rule count.
            const customRules = detector.custom_rules;
            if (customRules !== undefined) {
              anomaly.rulesLength = customRules.length;
            }

            // Add properties used for building the links menu.
            // TODO - when job_service is moved server_side, move this to server endpoint.
            if (has(mlJobService.customUrlsByJob, jobId)) {
              anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
            }
          });

          return {
            tableData: {
              anomalies,
              interval: resp.interval,
              examplesByJobId: resp.examplesByJobId,
              showViewSeriesLink: false,
            },
          };
        })
      );
  };

  loadEntityValues = (callback = () => {}) => {
    const { timefilter } = this.props;
    const { detectorId, entities, selectedJob } = this.state;

    // Populate the entity input datalists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const bounds = timefilter.getActiveBounds();
    const detectorIndex = +detectorId;

    mlResultsService
      .getRecordsForCriteria(
        [selectedJob.job_id],
        [{ fieldName: 'detector_index', fieldValue: detectorIndex }],
        0,
        bounds.min.valueOf(),
        bounds.max.valueOf(),
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
      )
      .toPromise()
      .then(resp => {
        if (resp.records && resp.records.length > 0) {
          const firstRec = resp.records[0];

          this.setState(
            {
              entities: entities.map(entity => {
                const newEntity = { ...entity };
                if (firstRec.partition_field_name === newEntity.fieldName) {
                  newEntity.fieldValues = chain(resp.records)
                    .pluck('partition_field_value')
                    .uniq()
                    .value();
                }
                if (firstRec.over_field_name === newEntity.fieldName) {
                  newEntity.fieldValues = chain(resp.records)
                    .pluck('over_field_value')
                    .uniq()
                    .value();
                }
                if (firstRec.by_field_name === newEntity.fieldName) {
                  newEntity.fieldValues = chain(resp.records)
                    .pluck('by_field_value')
                    .uniq()
                    .value();
                }
                return newEntity;
              }),
            },
            callback
          );
        }
      });
  };

  loadForForecastId = forecastId => {
    const { appStateHandler, timefilter } = this.props;
    const { autoZoomDuration, contextChartData, selectedJob } = this.state;

    mlForecastService
      .getForecastDateRange(selectedJob, forecastId)
      .then(resp => {
        const bounds = timefilter.getActiveBounds();
        const earliest = moment(resp.earliest || timefilter.getTime().from);
        const latest = moment(resp.latest || timefilter.getTime().to);

        // Store forecast ID in the appState.
        appStateHandler(APP_STATE_ACTION.SET_FORECAST_ID, forecastId);

        // Set the zoom to centre on the start of the forecast range, depending
        // on the time range of the forecast and data.
        const earliestDataDate = first(contextChartData).date;
        const zoomLatestMs = Math.min(earliest + autoZoomDuration / 2, latest.valueOf());
        const zoomEarliestMs = Math.max(
          zoomLatestMs - autoZoomDuration,
          earliestDataDate.getTime()
        );

        const zoomState = {
          from: moment(zoomEarliestMs).toISOString(),
          to: moment(zoomLatestMs).toISOString(),
        };
        appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);

        // Ensure the forecast data will be shown if hidden previously.
        this.setState({ showForecast: true });

        if (earliest.isBefore(bounds.min) || latest.isAfter(bounds.max)) {
          const earliestMs = Math.min(earliest.valueOf(), bounds.min.valueOf());
          const latestMs = Math.max(latest.valueOf(), bounds.max.valueOf());

          timefilter.setTime({
            from: moment(earliestMs).toISOString(),
            to: moment(latestMs).toISOString(),
          });
        } else {
          // Refresh to show the requested forecast data.
          this.refresh();
        }
      })
      .catch(resp => {
        console.log(
          'Time series explorer - error loading time range of forecast from elasticsearch:',
          resp
        );
      });
  };

  refresh = (fullRefresh = true) => {
    // Skip the refresh if:
    // a) The global state's `skipRefresh` was set to true by the job selector to avoid race conditions
    //    when loading the Single Metric Viewer after a job/group and time range update.
    // b) A 'soft' refresh without a full page reload is already happening.
    if (
      get(this.props.globalState, 'ml.skipRefresh') ||
      (this.state.loading && fullRefresh === false)
    ) {
      return;
    }

    const { appStateHandler, timefilter } = this.props;
    const {
      detectorId: currentDetectorId,
      entities: currentEntities,
      loadCounter: currentLoadCounter,
      selectedJob: currentSelectedJob,
    } = this.state;

    if (currentSelectedJob === undefined) {
      return;
    }

    this.contextChartSelectedInitCallDone = false;

    // Only when `fullRefresh` is true we'll reset all data
    // and show the loading spinner within the page.
    this.setState(
      {
        fullRefresh,
        loadCounter: currentLoadCounter + 1,
        loading: true,
        ...(fullRefresh
          ? {
              chartDetails: undefined,
              contextChartData: undefined,
              contextForecastData: undefined,
              focusChartData: undefined,
              focusForecastData: undefined,
              modelPlotEnabled: isModelPlotEnabled(
                currentSelectedJob,
                +currentDetectorId,
                currentEntities
              ),
              hasResults: false,
              dataNotChartable: false,
            }
          : {}),
      },
      () => {
        const {
          detectorId,
          entities,
          loadCounter,
          jobs,
          modelPlotEnabled,
          selectedJob,
        } = this.state;
        const detectorIndex = +detectorId;

        let awaitingCount = 3;

        const stateUpdate = {};

        // finish() function, called after each data set has been loaded and processed.
        // The last one to call it will trigger the page render.
        const finish = counterVar => {
          awaitingCount--;
          if (awaitingCount === 0 && counterVar === loadCounter) {
            stateUpdate.hasResults =
              (Array.isArray(stateUpdate.contextChartData) &&
                stateUpdate.contextChartData.length > 0) ||
              (Array.isArray(stateUpdate.contextForecastData) &&
                stateUpdate.contextForecastData.length > 0);
            stateUpdate.loading = false;
            // Set zoomFrom/zoomTo attributes in scope which will result in the metric chart automatically
            // selecting the specified range in the context chart, and so loading that date range in the focus chart.
            if (stateUpdate.contextChartData.length) {
              // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
              stateUpdate.autoZoomDuration = getAutoZoomDuration(jobs, selectedJob);

              // Check for a zoom parameter in the appState (URL).
              let focusRange = calculateInitialFocusRange(
                appStateHandler(APP_STATE_ACTION.GET_ZOOM),
                stateUpdate.contextAggregationInterval,
                timefilter
              );

              if (focusRange === undefined) {
                focusRange = calculateDefaultFocusRange(
                  stateUpdate.autoZoomDuration,
                  stateUpdate.contextAggregationInterval,
                  stateUpdate.contextChartData,
                  stateUpdate.contextForecastData
                );
              }

              stateUpdate.zoomFrom = focusRange[0];
              stateUpdate.zoomTo = focusRange[1];
            }

            this.setState(stateUpdate);
          }
        };

        const nonBlankEntities = currentEntities.filter(entity => {
          return entity.fieldValue.length > 0;
        });

        if (
          modelPlotEnabled === false &&
          isSourceDataChartableForDetector(selectedJob, detectorIndex) === false &&
          nonBlankEntities.length > 0
        ) {
          // For detectors where model plot has been enabled with a terms filter and the
          // selected entity(s) are not in the terms list, indicate that data cannot be viewed.
          stateUpdate.hasResults = false;
          stateUpdate.loading = false;
          stateUpdate.dataNotChartable = true;
          this.setState(stateUpdate);
          return;
        }

        const bounds = timefilter.getActiveBounds();

        // Calculate the aggregation interval for the context chart.
        // Context chart swimlane will display bucket anomaly score at the same interval.
        stateUpdate.contextAggregationInterval = calculateAggregationInterval(
          bounds,
          CHARTS_POINT_TARGET,
          jobs,
          selectedJob
        );

        // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
        // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
        // to some extent with all detector functions if not searching complete buckets.
        const searchBounds = getBoundsRoundedToInterval(
          bounds,
          stateUpdate.contextAggregationInterval,
          false
        );

        // Query 1 - load metric data at low granularity across full time range.
        // Pass a counter flag into the finish() function to make sure we only process the results
        // for the most recent call to the load the data in cases where the job selection and time filter
        // have been altered in quick succession (such as from the job picker with 'Apply time range').
        const counter = loadCounter;
        mlTimeSeriesSearchService
          .getMetricData(
            selectedJob,
            detectorIndex,
            nonBlankEntities,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            stateUpdate.contextAggregationInterval.expression
          )
          .toPromise()
          .then(resp => {
            const fullRangeChartData = processMetricPlotResults(resp.results, modelPlotEnabled);
            stateUpdate.contextChartData = fullRangeChartData;
            finish(counter);
          })
          .catch(resp => {
            console.log(
              'Time series explorer - error getting metric data from elasticsearch:',
              resp
            );
          });

        // Query 2 - load max record score at same granularity as context chart
        // across full time range for use in the swimlane.
        mlResultsService
          .getRecordMaxScoreByTime(
            selectedJob.job_id,
            this._criteriaFields,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            stateUpdate.contextAggregationInterval.expression
          )
          .then(resp => {
            const fullRangeRecordScoreData = processRecordScoreResults(resp.results);
            stateUpdate.swimlaneData = fullRangeRecordScoreData;
            finish(counter);
          })
          .catch(resp => {
            console.log(
              'Time series explorer - error getting bucket anomaly scores from elasticsearch:',
              resp
            );
          });

        // Query 3 - load details on the chart used in the chart title (charting function and entity(s)).
        mlTimeSeriesSearchService
          .getChartDetails(
            selectedJob,
            detectorIndex,
            entities,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf()
          )
          .then(resp => {
            stateUpdate.chartDetails = resp.results;
            finish(counter);
          })
          .catch(resp => {
            console.log(
              'Time series explorer - error getting entity counts from elasticsearch:',
              resp
            );
          });

        // Plus query for forecast data if there is a forecastId stored in the appState.
        const forecastId = appStateHandler(APP_STATE_ACTION.GET_FORECAST_ID);
        if (forecastId !== undefined) {
          awaitingCount++;
          let aggType = undefined;
          const detector = selectedJob.analysis_config.detectors[detectorIndex];
          const esAgg = mlFunctionToESAggregation(detector.function);
          if (modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
            aggType = { avg: 'sum', max: 'sum', min: 'sum' };
          }
          mlForecastService
            .getForecastData(
              selectedJob,
              detectorIndex,
              forecastId,
              nonBlankEntities,
              searchBounds.min.valueOf(),
              searchBounds.max.valueOf(),
              stateUpdate.contextAggregationInterval.expression,
              aggType
            )
            .toPromise()
            .then(resp => {
              stateUpdate.contextForecastData = processForecastResults(resp.results);
              finish(counter);
            })
            .catch(resp => {
              console.log(
                `Time series explorer - error loading data for forecast ID ${forecastId}`,
                resp
              );
            });
        }

        this.loadEntityValues();
      }
    );
  };

  /**
   * Updates local state of detector related controls from the global state.
   * @param callback to invoke after a state update.
   */
  updateControlsForDetector = (callback = () => {}) => {
    const { appStateHandler } = this.props;
    const { detectorId, selectedJob } = this.state;
    // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
    const detectorIndex = +detectorId;
    const detector = selectedJob.analysis_config.detectors[detectorIndex];

    const entities = [];
    const entitiesState = appStateHandler(APP_STATE_ACTION.GET_ENTITIES);
    const partitionFieldName = get(detector, 'partition_field_name');
    const overFieldName = get(detector, 'over_field_name');
    const byFieldName = get(detector, 'by_field_name');
    if (partitionFieldName !== undefined) {
      const partitionFieldValue = get(entitiesState, partitionFieldName, '');
      entities.push({ fieldName: partitionFieldName, fieldValue: partitionFieldValue });
    }
    if (overFieldName !== undefined) {
      const overFieldValue = get(entitiesState, overFieldName, '');
      entities.push({ fieldName: overFieldName, fieldValue: overFieldValue });
    }

    // For jobs with by and over fields, don't add the 'by' field as this
    // field will only be added to the top-level fields for record type results
    // if it also an influencer over the bucket.
    // TODO - metric data can be filtered by this field, so should only exclude
    // from filter for the anomaly records.
    if (byFieldName !== undefined && overFieldName === undefined) {
      const byFieldValue = get(entitiesState, byFieldName, '');
      entities.push({ fieldName: byFieldName, fieldValue: byFieldValue });
    }

    this.updateCriteriaFields(detectorIndex, entities);

    this.setState({ entities }, callback);
  };

  /**
   * Updates criteria fields for API calls, e.g. getAnomaliesTableData
   * @param detectorIndex
   * @param entities
   */
  updateCriteriaFields(detectorIndex, entities) {
    // Only filter on the entity if the field has a value.
    const nonBlankEntities = entities.filter(entity => entity.fieldValue.length > 0);
    this._criteriaFields = [
      {
        fieldName: 'detector_index',
        fieldValue: detectorIndex,
      },
      ...nonBlankEntities,
    ];
  }

  loadForJobId(jobId, jobs) {
    const { appStateHandler } = this.props;

    // Validation that the ID is for a time series job must already have been performed.
    // Check if the job was created since the page was first loaded.
    let jobPickerSelectedJob = find(jobs, { id: jobId });
    if (jobPickerSelectedJob === undefined) {
      const newJobs = [];
      each(mlJobService.jobs, job => {
        if (isTimeSeriesViewJob(job) === true) {
          const bucketSpan = parseInterval(job.analysis_config.bucket_span);
          newJobs.push({
            id: job.job_id,
            selected: false,
            bucketSpanSeconds: bucketSpan.asSeconds(),
          });
        }
      });
      this.setState({ jobs: newJobs });
      jobPickerSelectedJob = find(newJobs, { id: jobId });
    }

    const selectedJob = mlJobService.getJob(jobId);

    // Read the detector index and entities out of the AppState.
    const jobDetectors = selectedJob.analysis_config.detectors;
    const viewableDetectors = [];
    each(jobDetectors, (dtr, index) => {
      if (isTimeSeriesViewDetector(selectedJob, index)) {
        viewableDetectors.push({
          index: '' + index,
          detector_description: dtr.detector_description,
        });
      }
    });
    const detectors = viewableDetectors;

    // Check the supplied index is valid.
    const appStateDtrIdx = appStateHandler(APP_STATE_ACTION.GET_DETECTOR_INDEX);
    let detectorIndex = appStateDtrIdx !== undefined ? appStateDtrIdx : +viewableDetectors[0].index;
    if (find(viewableDetectors, { index: '' + detectorIndex }) === undefined) {
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
      toastNotifications.addWarning(warningText);
      detectorIndex = +viewableDetectors[0].index;
      appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, detectorIndex);
    }

    // Store the detector index as a string so it can be used as ng-model in a select control.
    const detectorId = '' + detectorIndex;

    this.setState({ detectorId, detectors, selectedJob }, () => {
      this.updateControlsForDetector(() => {
        // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
        mlFieldFormatService
          .populateFormats([jobId])
          .catch(err => {
            console.log('Error populating field formats:', err);
          })
          // Load the data - if the FieldFormats failed to populate
          // the default formatting will be used for metric values.
          .then(() => {
            this.refresh();
          });
      });
    });
  }

  saveSeriesPropertiesAndRefresh = () => {
    const { appStateHandler } = this.props;
    const { detectorId, entities } = this.state;

    appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, +detectorId);
    appStateHandler(
      APP_STATE_ACTION.SET_ENTITIES,
      entities.reduce((appStateEntities, entity) => {
        appStateEntities[entity.fieldName] = entity.fieldValue;
        return appStateEntities;
      }, {})
    );

    this.refresh();
  };

  componentDidMount() {
    const { appStateHandler, globalState, timefilter } = this.props;

    this.setState({ jobs: [] });

    // Get the job info needed by the visualization, then do the first load.
    if (mlJobService.jobs.length > 0) {
      const jobs = createTimeSeriesJobData(mlJobService.jobs);
      this.setState({ jobs });
    } else {
      this.setState({ loading: false });
    }

    // Reload the anomalies table if the Interval or Threshold controls are changed.
    const tableControlsListener = () => {
      const { zoomFrom, zoomTo } = this.state;
      if (zoomFrom !== undefined && zoomTo !== undefined) {
        this.loadAnomaliesTableData(zoomFrom.getTime(), zoomTo.getTime()).subscribe(res =>
          this.setState(res)
        );
      }
    };

    this.subscriptions.add(annotationsRefresh$.subscribe(this.refresh));
    this.subscriptions.add(interval$.subscribe(tableControlsListener));
    this.subscriptions.add(severity$.subscribe(tableControlsListener));
    this.subscriptions.add(
      mlTimefilterRefresh$.subscribe(() => {
        this.refresh(true);
      })
    );

    // Listen for changes to job selection.
    this.subscriptions.add(
      this.jobSelectService$.subscribe(({ selection: selectedJobIds }) => {
        const jobs = createTimeSeriesJobData(mlJobService.jobs);

        this.contextChartSelectedInitCallDone = false;
        this.setState({ fullRefresh: false, loading: true, showForecastCheckbox: false });

        const timeSeriesJobIds = jobs.map(j => j.id);

        // Check if any of the jobs set in the URL are not time series jobs
        // (e.g. if switching to this view straight from the Anomaly Explorer).
        const invalidIds = difference(selectedJobIds, timeSeriesJobIds);
        selectedJobIds = without(selectedJobIds, ...invalidIds);
        if (invalidIds.length > 0) {
          let warningText = i18n.translate(
            'xpack.ml.timeSeriesExplorer.canNotViewRequestedJobsWarningMessage',
            {
              defaultMessage: `You can't view requested {invalidIdsCount, plural, one {job} other {jobs}} {invalidIds} in this dashboard`,
              values: {
                invalidIdsCount: invalidIds.length,
                invalidIds,
              },
            }
          );
          if (selectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
            warningText += i18n.translate('xpack.ml.timeSeriesExplorer.autoSelectingFirstJobText', {
              defaultMessage: ', auto selecting first job',
            });
          }
          toastNotifications.addWarning(warningText);
        }

        if (selectedJobIds.length > 1) {
          // if more than one job or a group has been loaded from the URL
          if (selectedJobIds.length > 1) {
            // if more than one job, select the first job from the selection.
            toastNotifications.addWarning(
              i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
                defaultMessage: 'You can only view one job at a time in this dashboard',
              })
            );

            setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
            this.jobSelectService$.next({ selection: [selectedJobIds[0]], resetSelection: true });
          } else {
            // if a group has been loaded
            if (selectedJobIds.length > 0) {
              // if the group contains valid jobs, select the first
              toastNotifications.addWarning(
                i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
                  defaultMessage: 'You can only view one job at a time in this dashboard',
                })
              );

              setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
              this.jobSelectService$.next({ selection: [selectedJobIds[0]], resetSelection: true });
            } else if (jobs.length > 0) {
              // if there are no valid jobs in the group but there are valid jobs
              // in the list of all jobs, select the first
              setGlobalState(globalState, { selectedIds: [jobs[0].id] });
              this.jobSelectService$.next({ selection: [jobs[0].id], resetSelection: true });
            } else {
              // if there are no valid jobs left.
              this.setState({ loading: false });
            }
          }
        } else if (invalidIds.length > 0 && selectedJobIds.length > 0) {
          // if some ids have been filtered out because they were invalid.
          // refresh the URL with the first valid id
          setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
          this.jobSelectService$.next({ selection: [selectedJobIds[0]], resetSelection: true });
        } else if (selectedJobIds.length > 0) {
          // normal behavior. a job ID has been loaded from the URL
          if (
            this.state.selectedJob !== undefined &&
            selectedJobIds[0] !== this.state.selectedJob.job_id
          ) {
            // Clear the detectorIndex, entities and forecast info.
            appStateHandler(APP_STATE_ACTION.CLEAR);
          }
          this.loadForJobId(selectedJobIds[0], jobs);
        } else {
          if (selectedJobIds.length === 0 && jobs.length > 0) {
            // no jobs were loaded from the URL, so add the first job
            // from the full jobs list.
            setGlobalState(globalState, { selectedIds: [jobs[0].id] });
            this.jobSelectService$.next({ selection: [jobs[0].id], resetSelection: true });
          } else {
            // Jobs exist, but no time series jobs.
            this.setState({ loading: false });
          }
        }
      })
    );

    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    this.subscriptions.add(timefilter.getTimeUpdate$().subscribe(() => this.refresh(false)));

    // Required to redraw the time series chart when the container is resized.
    this.resizeChecker = new ResizeChecker(this.resizeRef.current);
    this.resizeChecker.on('resize', () => {
      this.resizeHandler();
    });
    this.resizeHandler();

    // Listen for context chart updates.
    this.subscriptions.add(
      this.contextChart$
        .pipe(
          tap(selection => {
            this.setState({
              zoomFrom: selection.from,
              zoomTo: selection.to,
            });
          }),
          debounceTime(500),
          tap(selection => {
            const {
              contextChartData,
              contextForecastData,
              focusChartData,
              zoomFromFocusLoaded,
              zoomToFocusLoaded,
            } = this.state;

            if (
              (contextChartData === undefined || contextChartData.length === 0) &&
              (contextForecastData === undefined || contextForecastData.length === 0)
            ) {
              return;
            }

            const defaultRange = this.getDefaultRangeFromState();

            if (
              (selection.from.getTime() !== defaultRange[0].getTime() ||
                selection.to.getTime() !== defaultRange[1].getTime()) &&
              isNaN(Date.parse(selection.from)) === false &&
              isNaN(Date.parse(selection.to)) === false
            ) {
              const zoomState = {
                from: selection.from.toISOString(),
                to: selection.to.toISOString(),
              };
              appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);
            } else {
              appStateHandler(APP_STATE_ACTION.UNSET_ZOOM);
            }

            if (
              (this.contextChartSelectedInitCallDone === false && focusChartData === undefined) ||
              zoomFromFocusLoaded.getTime() !== selection.from.getTime() ||
              zoomToFocusLoaded.getTime() !== selection.to.getTime()
            ) {
              this.contextChartSelectedInitCallDone = true;

              this.setState({
                loading: true,
                fullRefresh: false,
              });
            }
          }),
          switchMap(selection => {
            const { jobs, selectedJob } = this.state;

            // Calculate the aggregation interval for the focus chart.
            const bounds = { min: moment(selection.from), max: moment(selection.to) };
            const focusAggregationInterval = calculateAggregationInterval(
              bounds,
              CHARTS_POINT_TARGET,
              jobs,
              selectedJob
            );

            // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
            // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
            // to some extent with all detector functions if not searching complete buckets.
            const searchBounds = getBoundsRoundedToInterval(
              bounds,
              focusAggregationInterval,
              false
            );
            return forkJoin([
              this.getFocusData(selection),
              // Load the data for the anomalies table.
              this.loadAnomaliesTableData(searchBounds.min.valueOf(), searchBounds.max.valueOf()),
            ]);
          }),
          withLatestFrom(this.contextChart$)
        )
        .subscribe(([[refreshFocusData, tableData], selection]) => {
          const { modelPlotEnabled } = this.state;

          // All the data is ready now for a state update.
          this.setState({
            focusAggregationInterval: this.getFocusAggregationInterval({
              from: selection.from,
              to: selection.to,
            }),
            loading: false,
            showModelBoundsCheckbox: modelPlotEnabled && refreshFocusData.focusChartData.length > 0,
            zoomFromFocusLoaded: selection.from,
            zoomToFocusLoaded: selection.to,
            ...refreshFocusData,
            ...tableData,
          });
        })
    );
  }

  componentWillUnmount() {
    this.subscriptions.unsubscribe();
    this.resizeChecker.destroy();
    this.unsubscribeFromGlobalState();
  }

  render() {
    const { dateFormatTz, globalState, timefilter } = this.props;

    const {
      autoZoomDuration,
      chartDetails,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
      dataNotChartable,
      detectors,
      detectorId,
      entities,
      focusAggregationInterval,
      focusAnnotationData,
      focusChartData,
      focusForecastData,
      fullRefresh,
      hasResults,
      jobs,
      loading,
      modelPlotEnabled,
      selectedJob,
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
    } = this.state;

    const fieldNamesWithEmptyValues = entities
      .filter(({ fieldValue }) => !fieldValue)
      .map(({ fieldName }) => fieldName);
    const arePartitioningFieldsProvided = fieldNamesWithEmptyValues.length === 0;

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
      skipRefresh: loading || !!get(this.props.globalState, 'ml.skipRefresh'),
      svgWidth,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      autoZoomDuration,
    };

    const { jobIds: selectedJobIds, selectedGroups } = getSelectedJobIds(globalState);
    const jobSelectorProps = {
      dateFormatTz,
      globalState,
      jobSelectService$: this.jobSelectService$,
      selectedJobIds,
      selectedGroups,
      singleSelection: true,
      timeseriesOnly: true,
    };

    if (jobs.length === 0) {
      return (
        <TimeSeriesExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <TimeseriesexplorerNoJobsFound />
        </TimeSeriesExplorerPage>
      );
    }

    const detectorSelectOptions = detectors.map(d => ({
      value: d.index,
      text: d.detector_description,
    }));

    let renderFocusChartOnly = true;

    if (
      isEqual(this.previousChartProps.focusForecastData, chartProps.focusForecastData) &&
      isEqual(this.previousChartProps.focusChartData, chartProps.focusChartData) &&
      isEqual(this.previousChartProps.focusAnnotationData, chartProps.focusAnnotationData) &&
      this.previousShowAnnotations === showAnnotations &&
      this.previousShowForecast === showForecast &&
      this.previousShowModelBounds === showModelBounds
    ) {
      renderFocusChartOnly = false;
    }

    this.previousChartProps = chartProps;
    this.previousShowAnnotations = showAnnotations;
    this.previousShowForecast = showForecast;
    this.previousShowModelBounds = showModelBounds;

    /**
     * Indicates if any of the previous controls is empty.
     * @type {boolean}
     */
    let hasEmptyFieldValues = false;

    return (
      <TimeSeriesExplorerPage
        jobSelectorProps={jobSelectorProps}
        loading={loading}
        resizeRef={this.resizeRef}
      >
        {fieldNamesWithEmptyValues.length > 0 && (
          <EuiCallOut
            className="single-metric-request-callout"
            title={
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.singleMetricRequiredMessage"
                defaultMessage="To view a single metric you must select {missingValuesCount, plural, one {a value for {fieldName1}} other {values for {fieldName1} and {fieldName2}}}"
                values={{
                  missingValuesCount: fieldNamesWithEmptyValues.length,
                  fieldName1: fieldNamesWithEmptyValues[0],
                  fieldName2: fieldNamesWithEmptyValues[1],
                }}
              />
            }
            color="warning"
            iconType="help"
            size="s"
          />
        )}

        <div className="series-controls" data-test-subj="mlSingleMetricViewerSeriesControls">
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.ml.timeSeriesExplorer.detectorLabel', {
                  defaultMessage: 'Detector',
                })}
              >
                <EuiSelect
                  onChange={this.detectorIndexChangeHandler}
                  value={detectorId}
                  options={detectorSelectOptions}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {entities.map(entity => {
              const entityKey = `${entity.fieldName}`;
              const forceSelection = !hasEmptyFieldValues && !entity.fieldValue;
              hasEmptyFieldValues = !hasEmptyFieldValues && forceSelection;
              return (
                <EntityControl
                  entity={entity}
                  entityFieldValueChanged={this.entityFieldValueChanged}
                  forceSelection={forceSelection}
                  key={entityKey}
                />
              );
            })}
            {arePartitioningFieldsProvided && (
              <EuiFlexItem style={{ textAlign: 'right' }}>
                <EuiFormRow hasEmptyLabelSpace style={{ maxWidth: '100%' }}>
                  <ForecastingModal
                    job={selectedJob}
                    detectorIndex={+detectorId}
                    entities={entities}
                    loadForForecastId={this.loadForForecastId}
                    className="forecast-controls"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>

        {fullRefresh && loading === true && (
          <LoadingIndicator
            label={i18n.translate('xpack.ml.timeSeriesExplorer.loadingLabel', {
              defaultMessage: 'Loading',
            })}
          />
        )}

        {arePartitioningFieldsProvided &&
          jobs.length > 0 &&
          (fullRefresh === false || loading === false) &&
          hasResults === false && (
            <TimeseriesexplorerNoChartData
              dataNotChartable={dataNotChartable}
              entities={entities}
            />
          )}

        {arePartitioningFieldsProvided &&
          jobs.length > 0 &&
          (fullRefresh === false || loading === false) &&
          hasResults === true && (
            <EuiText className="results-container">
              {/* Make sure ChartTooltip is inside this plain wrapping element so positioning can be infered correctly. */}
              <ChartTooltip />
              <span className="panel-title">
                {i18n.translate('xpack.ml.timeSeriesExplorer.singleTimeSeriesAnalysisTitle', {
                  defaultMessage: 'Single time series analysis of {functionLabel}',
                  values: { functionLabel: chartDetails.functionLabel },
                })}
              </span>
              &nbsp;
              {chartDetails.entityData.count === 1 && (
                <span className="entity-count-text">
                  {chartDetails.entityData.entities.length > 0 && '('}
                  {chartDetails.entityData.entities
                    .map(entity => {
                      return `${entity.fieldName}: ${entity.fieldValue}`;
                    })
                    .join(', ')}
                  {chartDetails.entityData.entities.length > 0 && ')'}
                </span>
              )}
              {chartDetails.entityData.count !== 1 && (
                <span className="entity-count-text">
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
                                i === chartDetails.entityData.entities.length - 1 ? ')' : '',
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
                </span>
              )}
              <EuiFlexGroup style={{ float: 'right' }}>
                {showModelBoundsCheckbox && (
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="toggleModelBoundsCheckbox"
                      label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
                        defaultMessage: 'show model bounds',
                      })}
                      checked={showModelBounds}
                      onChange={this.toggleShowModelBoundsHandler}
                    />
                  </EuiFlexItem>
                )}

                {showAnnotationsCheckbox && (
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="toggleAnnotationsCheckbox"
                      label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
                        defaultMessage: 'annotations',
                      })}
                      checked={showAnnotations}
                      onChange={this.toggleShowAnnotationsHandler}
                    />
                  </EuiFlexItem>
                )}

                {showForecastCheckbox && (
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="toggleShowForecastCheckbox"
                      label={i18n.translate('xpack.ml.timeSeriesExplorer.showForecastLabel', {
                        defaultMessage: 'show forecast',
                      })}
                      checked={showForecast}
                      onChange={this.toggleShowForecastHandler}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <div className="ml-timeseries-chart" data-test-subj="mlSingleMetricViewerChart">
                <TimeseriesChart
                  {...chartProps}
                  detectorIndex={detectorId}
                  renderFocusChartOnly={renderFocusChartOnly}
                  selectedJob={selectedJob}
                  showAnnotations={showAnnotations}
                  showForecast={showForecast}
                  showModelBounds={showModelBounds}
                  timefilter={timefilter}
                />
              </div>
              {showAnnotations && focusAnnotationData.length > 0 && (
                <div>
                  <span className="panel-title">
                    {i18n.translate('xpack.ml.timeSeriesExplorer.annotationsTitle', {
                      defaultMessage: 'Annotations',
                    })}
                  </span>
                  <AnnotationsTable
                    annotations={focusAnnotationData}
                    isSingleMetricViewerLinkVisible={false}
                    isNumberBadgeVisible={true}
                  />
                  <EuiSpacer size="l" />
                </div>
              )}
              <AnnotationFlyout />
              <span className="panel-title">
                {i18n.translate('xpack.ml.timeSeriesExplorer.anomaliesTitle', {
                  defaultMessage: 'Anomalies',
                })}
              </span>
              <EuiFlexGroup
                direction="row"
                gutterSize="l"
                responsive={true}
                className="ml-anomalies-controls"
              >
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.severityThresholdLabel', {
                      defaultMessage: 'Severity threshold',
                    })}
                  >
                    <SelectSeverity />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={i18n.translate('xpack.ml.timeSeriesExplorer.intervalLabel', {
                      defaultMessage: 'Interval',
                    })}
                  >
                    <SelectInterval />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </EuiText>
          )}
        {arePartitioningFieldsProvided && jobs.length > 0 && (
          <AnomaliesTable tableData={tableData} filter={this.tableFilter} timefilter={timefilter} />
        )}
      </TimeSeriesExplorerPage>
    );
  }
}
