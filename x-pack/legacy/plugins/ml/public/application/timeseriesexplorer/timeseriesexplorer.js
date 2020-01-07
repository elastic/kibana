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
import {
  isModelPlotEnabled,
  isSourceDataChartableForDetector,
  isTimeSeriesViewDetector,
  mlFunctionToESAggregation,
} from '../../../common/util/job_utils';

import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { ChartTooltip } from '../components/chart_tooltip';
import { EntityControl } from './components/entity_control';
import { ForecastingModal } from './components/forecasting_modal/forecasting_modal';
import { JobSelector } from '../components/job_selector';
import { getTimeRangeFromSelection } from '../components/job_selector/job_select_service_utils';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { NavigationMenu } from '../components/navigation_menu';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import { TimeseriesChart } from './components/timeseries_chart/timeseries_chart';
import { TimeseriesexplorerNoJobsFound } from './components/timeseriesexplorer_no_jobs_found';
import { TimeseriesexplorerNoChartData } from './components/timeseriesexplorer_no_chart_data';

import { ml } from '../services/ml_api_service';
import { mlFieldFormatService } from '../services/field_format_service';
import { mlForecastService } from '../services/forecast_service';
import { mlJobService } from '../services/job_service';
import { mlResultsService } from '../services/results_service';

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

function getEntityControlOptions(fieldValues) {
  if (!Array.isArray(fieldValues)) {
    return [];
  }

  return fieldValues.map(value => {
    return { label: value };
  });
}

function getViewableDetectors(selectedJob) {
  const jobDetectors = selectedJob.analysis_config.detectors;
  const viewableDetectors = [];
  each(jobDetectors, (dtr, index) => {
    if (isTimeSeriesViewDetector(selectedJob, index)) {
      viewableDetectors.push({
        index,
        detector_description: dtr.detector_description,
      });
    }
  });
  return viewableDetectors;
}

function getTimeseriesexplorerDefaultState() {
  return {
    autoZoomDuration: undefined,
    chartDetails: undefined,
    contextAggregationInterval: undefined,
    contextChartData: undefined,
    contextForecastData: undefined,
    // Not chartable if e.g. model plot with terms for a varp detector
    dataNotChartable: false,
    entityValues: {},
    focusAnnotationData: [],
    focusChartData: undefined,
    focusForecastData: undefined,
    fullRefresh: true,
    hasResults: false,
    // Counter to keep track of what data sets have been loaded.
    loadCounter: 0,
    loading: false,
    modelPlotEnabled: false,
    // Toggles display of annotations in the focus chart
    showAnnotations: mlAnnotationsEnabled,
    showAnnotationsCheckbox: mlAnnotationsEnabled,
    // Toggles display of forecast data in the focus chart
    showForecast: true,
    showForecastCheckbox: false,
    // Toggles display of model bounds in the focus chart
    showModelBounds: true,
    showModelBoundsCheckbox: false,
    svgWidth: 0,
    tableData: undefined,
    zoomFrom: undefined,
    zoomTo: undefined,
    zoomFromFocusLoaded: undefined,
    zoomToFocusLoaded: undefined,
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
    bounds: PropTypes.object,
    dateFormatTz: PropTypes.string.isRequired,
    jobsWithTimeRange: PropTypes.array.isRequired,
    lastRefresh: PropTypes.number.isRequired,
    selectedJobIds: PropTypes.arrayOf(PropTypes.string),
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.number,
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

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject();

  detectorIndexChangeHandler = e => {
    const { appStateHandler } = this.props;
    const id = e.target.value;
    if (id !== undefined) {
      appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, +id);
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
    const entities = this.getControlsForDetector();
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
  };

  contextChartSelectedInitCallDone = false;

  getFocusAggregationInterval(selection) {
    const { selectedJobIds } = this.props;
    const jobs = createTimeSeriesJobData(mlJobService.jobs);
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, jobs, selectedJob);
  }

  /**
   * Gets focus data for the current component state/
   */
  getFocusData(selection) {
    const { selectedJobIds, selectedForecastId, selectedDetectorIndex } = this.props;
    const { modelPlotEnabled } = this.state;
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);
    const entityControls = this.getControlsForDetector();

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };
    const focusAggregationInterval = this.getFocusAggregationInterval(selection);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);

    return getFocusData(
      this.getCriteriaFields(selectedDetectorIndex, entityControls),
      selectedDetectorIndex,
      focusAggregationInterval,
      selectedForecastId,
      modelPlotEnabled,
      entityControls.filter(entity => entity.fieldValue.length > 0),
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
    const entityControls = this.getControlsForDetector();

    const resultEntities = {
      ...entityControls.reduce((appStateEntities, appStateEntity) => {
        appStateEntities[appStateEntity.fieldName] = appStateEntity.fieldValue;
        return appStateEntities;
      }, {}),
      [entity.fieldName]: fieldValue,
    };

    appStateHandler(APP_STATE_ACTION.SET_ENTITIES, resultEntities);
  };

  loadAnomaliesTableData = (earliestMs, latestMs) => {
    const {
      dateFormatTz,
      selectedDetectorIndex,
      selectedJobIds,
      tableInterval,
      tableSeverity,
    } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);
    const entityControls = this.getControlsForDetector();

    return ml.results
      .getAnomaliesTableData(
        [selectedJob.job_id],
        this.getCriteriaFields(selectedDetectorIndex, entityControls),
        [],
        tableInterval,
        tableSeverity,
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

  loadEntityValues = entities => {
    const { bounds, selectedJobIds, selectedDetectorIndex } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);

    // Populate the entity input datalists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const detectorIndex = selectedDetectorIndex;

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

          const entityValues = {};
          entities.forEach(entity => {
            let fieldValues;
            if (firstRec.partition_field_name === entity.fieldName) {
              fieldValues = chain(resp.records)
                .pluck('partition_field_value')
                .uniq()
                .value();
            }
            if (firstRec.over_field_name === entity.fieldName) {
              fieldValues = chain(resp.records)
                .pluck('over_field_value')
                .uniq()
                .value();
            }
            if (firstRec.by_field_name === entity.fieldName) {
              fieldValues = chain(resp.records)
                .pluck('by_field_value')
                .uniq()
                .value();
            }
            entityValues[entity.fieldName] = fieldValues;
          });

          this.setState({ entityValues });
        }
      });
  };

  loadForForecastId = forecastId => {
    const { appStateHandler, bounds, selectedJobIds, timefilter } = this.props;
    const { autoZoomDuration, contextChartData } = this.state;
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);

    mlForecastService
      .getForecastDateRange(selectedJob, forecastId)
      .then(resp => {
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

          // TODO change this to use setGlobalState
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

  loadSingleMetricData = (fullRefresh = true) => {
    // Skip the refresh if a 'soft' refresh without a full page reload is already happening.
    if (this.state.loading && fullRefresh === false) {
      return;
    }

    const { bounds, selectedDetectorIndex, selectedForecastId, selectedJobIds, zoom } = this.props;

    if (selectedJobIds === undefined) {
      return;
    }

    const { loadCounter: currentLoadCounter } = this.state;

    const currentSelectedJob = mlJobService.getJob(selectedJobIds[0]);

    this.contextChartSelectedInitCallDone = false;

    // Only when `fullRefresh` is true we'll reset all data
    // and show the loading spinner within the page.
    const entityControls = this.getControlsForDetector();
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

        const jobs = createTimeSeriesJobData(mlJobService.jobs);
        const selectedJob = mlJobService.getJob(selectedJobIds[0]);
        const detectorIndex = selectedDetectorIndex;

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
                zoom,
                stateUpdate.contextAggregationInterval,
                bounds
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

        const nonBlankEntities = entityControls.filter(entity => {
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
            this.getCriteriaFields(detectorIndex, entityControls),
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
            entityControls,
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
        const forecastId = selectedForecastId;
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
      }
    );
  };

  /**
   * Updates local state of detector related controls from the global state.
   * @param callback to invoke after a state update.
   */
  getControlsForDetector = () => {
    const { selectedDetectorIndex, selectedEntities, selectedJobIds } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobIds[0]);
    // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
    const detectorIndex = selectedDetectorIndex;
    const detector = selectedJob.analysis_config.detectors[detectorIndex];

    const entities = [];
    const entitiesState = selectedEntities;
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

    return entities;
  };

  /**
   * Updates criteria fields for API calls, e.g. getAnomaliesTableData
   * @param detectorIndex
   * @param entities
   */
  getCriteriaFields(detectorIndex, entities) {
    // Only filter on the entity if the field has a value.
    const nonBlankEntities = entities.filter(entity => entity.fieldValue.length > 0);
    return [
      {
        fieldName: 'detector_index',
        fieldValue: detectorIndex,
      },
      ...nonBlankEntities,
    ];
  }

  loadForJobId(jobId) {
    const { appStateHandler, selectedDetectorIndex } = this.props;

    const selectedJob = mlJobService.getJob(jobId);
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
      toastNotifications.addWarning(warningText);
      detectorIndex = detectors[0].index;
    }

    const detectorId = detectorIndex;

    if (detectorId !== selectedDetectorIndex) {
      appStateHandler(APP_STATE_ACTION.SET_DETECTOR_INDEX, detectorId);
    }

    // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
    mlFieldFormatService.populateFormats([jobId]).catch(err => {
      console.log('Error populating field formats:', err);
    });
  }

  componentDidMount() {
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
            const { selectedJobIds } = this.props;
            const jobs = createTimeSeriesJobData(mlJobService.jobs);
            const selectedJob = mlJobService.getJob(selectedJobIds[0]);

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

    this.componentDidUpdate();
  }

  /**
   * returns true/false if setGlobalState has been triggered
   * or returns the job id which should be loaded.
   */
  checkJobSelection() {
    const { jobsWithTimeRange, selectedJobIds, setGlobalState } = this.props;

    const jobs = createTimeSeriesJobData(mlJobService.jobs);
    const timeSeriesJobIds = jobs.map(j => j.id);

    // Check if any of the jobs set in the URL are not time series jobs
    // (e.g. if switching to this view straight from the Anomaly Explorer).
    const invalidIds = difference(selectedJobIds, timeSeriesJobIds);
    const validSelectedJobIds = without(selectedJobIds, ...invalidIds);
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
      if (validSelectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
        warningText += i18n.translate('xpack.ml.timeSeriesExplorer.autoSelectingFirstJobText', {
          defaultMessage: ', auto selecting first job',
        });
      }
      toastNotifications.addWarning(warningText);
    }

    if (validSelectedJobIds.length > 1) {
      // if more than one job or a group has been loaded from the URL
      if (validSelectedJobIds.length > 1) {
        // if more than one job, select the first job from the selection.
        toastNotifications.addWarning(
          i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
            defaultMessage: 'You can only view one job at a time in this dashboard',
          })
        );
        setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
        return true;
      } else {
        // if a group has been loaded
        if (selectedJobIds.length > 0) {
          // if the group contains valid jobs, select the first
          toastNotifications.addWarning(
            i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
              defaultMessage: 'You can only view one job at a time in this dashboard',
            })
          );
          setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
          return true;
        } else if (jobs.length > 0) {
          // if there are no valid jobs in the group but there are valid jobs
          // in the list of all jobs, select the first
          const jobIds = [jobs[0].id];
          const time = getTimeRangeFromSelection(jobsWithTimeRange, jobIds);
          setGlobalState({
            ...{ ml: { jobIds } },
            ...(time !== undefined ? { time } : {}),
          });
          return true;
        } else {
          // if there are no valid jobs left.
          return false;
        }
      }
    } else if (invalidIds.length > 0 && validSelectedJobIds.length > 0) {
      // if some ids have been filtered out because they were invalid.
      // refresh the URL with the first valid id
      setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
      return true;
    } else if (validSelectedJobIds.length > 0) {
      // normal behavior. a job ID has been loaded from the URL
      // Clear the detectorIndex, entities and forecast info.
      return validSelectedJobIds[0];
    } else {
      if (validSelectedJobIds.length === 0 && jobs.length > 0) {
        // no jobs were loaded from the URL, so add the first job
        // from the full jobs list.
        const jobIds = [jobs[0].id];
        const time = getTimeRangeFromSelection(jobsWithTimeRange, jobIds);
        setGlobalState({
          ...{ ml: { jobIds } },
          ...(time !== undefined ? { time } : {}),
        });
        return true;
      } else {
        // Jobs exist, but no time series jobs.
        return false;
      }
    }
  }

  componentDidUpdate(previousProps) {
    if (
      previousProps === undefined ||
      !isEqual(previousProps.selectedJobIds, this.props.selectedJobIds)
    ) {
      const update = this.checkJobSelection();
      // - true means a setGlobalState got triggered and
      //   we'll just wait for the next React render.
      // - false means there are either no jobs or no time based jobs present.
      // - if we get back a string it means we got back a job id we can load.
      if (update === true) {
        return;
      } else if (update === false) {
        this.setState({ loading: false });
        return;
      } else if (typeof update === 'string') {
        this.contextChartSelectedInitCallDone = false;
        this.setState({ fullRefresh: false, loading: true, showForecastCheckbox: false }, () => {
          this.loadForJobId(update);
        });
      }
    }

    if (
      this.props.bounds !== undefined &&
      this.props.selectedJobIds !== undefined &&
      (previousProps === undefined ||
        !isEqual(previousProps.selectedJobIds, this.props.selectedJobIds) ||
        previousProps.selectedDetectorIndex !== this.props.selectedDetectorIndex ||
        !isEqual(previousProps.selectedEntities, this.props.selectedEntities))
    ) {
      const entityControls = this.getControlsForDetector();
      this.loadEntityValues(entityControls);
    }

    if (
      previousProps === undefined ||
      !isEqual(previousProps.bounds, this.props.bounds) ||
      !isEqual(previousProps.lastRefresh, this.props.lastRefresh) ||
      !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
      !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
      !isEqual(previousProps.selectedForecastId, this.props.selectedForecastId) ||
      !isEqual(previousProps.selectedJobIds, this.props.selectedJobIds) ||
      !isEqual(previousProps.zoom, this.props.zoom)
    ) {
      const fullRefresh =
        previousProps === undefined ||
        !isEqual(previousProps.lastRefresh, this.props.lastRefresh) ||
        !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
        !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
        !isEqual(previousProps.selectedJobIds, this.props.selectedJobIds);
      this.loadSingleMetricData(fullRefresh);
    }

    if (previousProps === undefined) {
      return;
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

    if (
      previousProps.tableInterval !== this.props.tableInterval ||
      previousProps.tableSeverity !== this.props.tableSeverity
    ) {
      tableControlsListener();
    }

    if (
      this.state.autoZoomDuration === undefined ||
      this.state.contextAggregationInterval === undefined ||
      this.state.contextChartData === undefined ||
      this.state.contextChartData.length === 0
    ) {
      return;
    }

    const defaultRange = calculateDefaultFocusRange(
      this.state.autoZoomDuration,
      this.state.contextAggregationInterval,
      this.state.contextChartData,
      this.state.contextForecastData
    );

    const selection = {
      from: this.state.zoomFrom,
      to: this.state.zoomTo,
    };

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
      this.props.appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);
    } else {
      this.props.appStateHandler(APP_STATE_ACTION.UNSET_ZOOM);
    }
  }

  componentWillUnmount() {
    this.subscriptions.unsubscribe();
    this.resizeChecker.destroy();
  }

  render() {
    const { bounds, dateFormatTz, lastRefresh, selectedDetectorIndex, selectedJobIds } = this.props;

    const {
      autoZoomDuration,
      chartDetails,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
      dataNotChartable,
      entityValues,
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
      svgWidth,
      swimlaneData,
      tableData,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
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

    const jobSelectorProps = {
      dateFormatTz,
      singleSelection: true,
      timeseriesOnly: true,
    };

    if (
      selectedJobIds === undefined ||
      selectedJobIds.length > 1 ||
      selectedDetectorIndex === undefined
    ) {
      return (
        <TimeSeriesExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef} />
      );
    }

    const entityControls = this.getControlsForDetector();
    const jobs = createTimeSeriesJobData(mlJobService.jobs);

    if (jobs.length === 0) {
      return (
        <TimeSeriesExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <TimeseriesexplorerNoJobsFound />
        </TimeSeriesExplorerPage>
      );
    }

    const selectedJob = mlJobService.getJob(selectedJobIds[0]);
    const fieldNamesWithEmptyValues = entityControls
      .filter(({ fieldValue }) => !fieldValue)
      .map(({ fieldName }) => fieldName);

    const arePartitioningFieldsProvided = fieldNamesWithEmptyValues.length === 0;

    const detectorSelectOptions = getViewableDetectors(selectedJob).map(d => ({
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
      this.previousShowModelBounds === showModelBounds &&
      this.previousLastRefresh === lastRefresh
    ) {
      renderFocusChartOnly = false;
    }

    this.previousChartProps = chartProps;
    this.previousLastRefresh = lastRefresh;
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
                  value={selectedDetectorIndex}
                  options={detectorSelectOptions}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {entityControls.map(entity => {
              const entityKey = `${entity.fieldName}`;
              const forceSelection = !hasEmptyFieldValues && !entity.fieldValue;
              hasEmptyFieldValues = !hasEmptyFieldValues && forceSelection;
              return (
                <EntityControl
                  entity={entity}
                  entityFieldValueChanged={this.entityFieldValueChanged}
                  forceSelection={forceSelection}
                  key={entityKey}
                  options={getEntityControlOptions(entityValues[entity.fieldName])}
                />
              );
            })}
            {arePartitioningFieldsProvided && (
              <EuiFlexItem style={{ textAlign: 'right' }}>
                <EuiFormRow hasEmptyLabelSpace style={{ maxWidth: '100%' }}>
                  <ForecastingModal
                    job={selectedJob}
                    detectorIndex={selectedDetectorIndex}
                    entities={entityControls}
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
              entities={entityControls}
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
                  bounds={bounds}
                  detectorIndex={selectedDetectorIndex}
                  renderFocusChartOnly={renderFocusChartOnly}
                  selectedJob={selectedJob}
                  showAnnotations={showAnnotations}
                  showForecast={showForecast}
                  showModelBounds={showModelBounds}
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
          <AnomaliesTable bounds={bounds} tableData={tableData} filter={this.tableFilter} />
        )}
      </TimeSeriesExplorerPage>
    );
  }
}
