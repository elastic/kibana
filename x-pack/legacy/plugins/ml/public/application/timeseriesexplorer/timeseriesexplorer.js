/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import { debounce, each, find, get, has, isEqual } from 'lodash';
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
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import { TimeseriesChart } from './components/timeseries_chart/timeseries_chart';
import { TimeseriesexplorerNoChartData } from './components/timeseriesexplorer_no_chart_data';
import { TimeSeriesExplorerPage } from './timeseriesexplorer_page';

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

  fieldValues.sort();

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
    chartDetails: undefined,
    contextAggregationInterval: undefined,
    contextChartData: undefined,
    contextForecastData: undefined,
    // Not chartable if e.g. model plot with terms for a varp detector
    dataNotChartable: false,
    entitiesLoading: false,
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

const containerPadding = 24;

export class TimeSeriesExplorer extends React.Component {
  static propTypes = {
    appStateHandler: PropTypes.func.isRequired,
    autoZoomDuration: PropTypes.number.isRequired,
    bounds: PropTypes.object.isRequired,
    dateFormatTz: PropTypes.string.isRequired,
    lastRefresh: PropTypes.number.isRequired,
    previousRefresh: PropTypes.number.isRequired,
    selectedJobId: PropTypes.string.isRequired,
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.number,
    zoom: PropTypes.object,
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

  /**
   * Returns field names that don't have a selection yet.
   */
  getFieldNamesWithEmptyValues = () => {
    const latestEntityControls = this.getControlsForDetector();
    return latestEntityControls
      .filter(({ fieldValue }) => !fieldValue)
      .map(({ fieldName }) => fieldName);
  };

  /**
   * Checks if all entity control dropdowns have a selection.
   */
  arePartitioningFieldsProvided = () => {
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    return fieldNamesWithEmptyValues.length === 0;
  };

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
    const { selectedJobId } = this.props;
    const jobs = createTimeSeriesJobData(mlJobService.jobs);
    const selectedJob = mlJobService.getJob(selectedJobId);

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, jobs, selectedJob);
  }

  /**
   * Gets focus data for the current component state/
   */
  getFocusData(selection) {
    const { selectedJobId, selectedForecastId, selectedDetectorIndex } = this.props;
    const { modelPlotEnabled } = this.state;
    const selectedJob = mlJobService.getJob(selectedJobId);
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

  entityFieldSearchChanged = debounce((entity, queryTerm) => {
    const entityControls = this.getControlsForDetector();
    this.loadEntityValues(entityControls, {
      [entity.fieldType]: queryTerm,
    });
  }, 500);

  loadAnomaliesTableData = (earliestMs, latestMs) => {
    const {
      dateFormatTz,
      selectedDetectorIndex,
      selectedJobId,
      tableInterval,
      tableSeverity,
    } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobId);
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

  /**
   * Loads available entity values.
   * @param {Array} entities - Entity controls configuration
   * @param {Object} searchTerm - Search term for partition, e.g. { partition_field: 'partition' }
   */
  loadEntityValues = async (entities, searchTerm = {}) => {
    this.setState({ entitiesLoading: true });

    const { bounds, selectedJobId, selectedDetectorIndex } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobId);

    // Populate the entity input datalists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const detectorIndex = selectedDetectorIndex;

    const {
      partition_field: partitionField,
      over_field: overField,
      by_field: byField,
    } = await mlResultsService
      .fetchPartitionFieldsValues(
        selectedJob.job_id,
        searchTerm,
        [
          {
            fieldName: 'detector_index',
            fieldValue: detectorIndex,
          },
        ],
        bounds.min.valueOf(),
        bounds.max.valueOf()
      )
      .toPromise();

    const entityValues = {};
    entities.forEach(entity => {
      let fieldValues;

      if (partitionField?.name === entity.fieldName) {
        fieldValues = partitionField.values;
      }
      if (overField?.name === entity.fieldName) {
        fieldValues = overField.values;
      }
      if (byField?.name === entity.fieldName) {
        fieldValues = byField.values;
      }
      entityValues[entity.fieldName] = fieldValues;
    });

    this.setState({ entitiesLoading: false, entityValues });
  };

  setForecastId = forecastId => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FORECAST_ID, forecastId);
  };

  loadSingleMetricData = (fullRefresh = true) => {
    const {
      autoZoomDuration,
      bounds,
      selectedDetectorIndex,
      selectedForecastId,
      selectedJobId,
      zoom,
    } = this.props;

    const { loadCounter: currentLoadCounter } = this.state;

    const currentSelectedJob = mlJobService.getJob(selectedJobId);

    if (currentSelectedJob === undefined) {
      return;
    }

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
        const selectedJob = mlJobService.getJob(selectedJobId);
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
            // Only touch the zoom range if data for the context chart has been loaded and all necessary
            // partition fields have a selection.
            if (
              stateUpdate.contextChartData.length &&
              this.arePartitioningFieldsProvided() === true
            ) {
              // Check for a zoom parameter in the appState (URL).
              let focusRange = calculateInitialFocusRange(
                zoom,
                stateUpdate.contextAggregationInterval,
                bounds
              );
              if (
                focusRange === undefined ||
                this.previousSelectedForecastId !== this.props.selectedForecastId
              ) {
                focusRange = calculateDefaultFocusRange(
                  autoZoomDuration,
                  stateUpdate.contextAggregationInterval,
                  stateUpdate.contextChartData,
                  stateUpdate.contextForecastData
                );
                this.previousSelectedForecastId = this.props.selectedForecastId;
              }

              this.contextChartSelected({
                from: focusRange[0],
                to: focusRange[1],
              });
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
        if (selectedForecastId !== undefined) {
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
              selectedForecastId,
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
                `Time series explorer - error loading data for forecast ID ${selectedForecastId}`,
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
    const { selectedDetectorIndex, selectedEntities, selectedJobId } = this.props;
    const selectedJob = mlJobService.getJob(selectedJobId);

    const entities = [];

    if (selectedJob === undefined) {
      return entities;
    }

    // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
    const detectorIndex = selectedDetectorIndex;
    const detector = selectedJob.analysis_config.detectors[detectorIndex];

    const entitiesState = selectedEntities;
    const partitionFieldName = get(detector, 'partition_field_name');
    const overFieldName = get(detector, 'over_field_name');
    const byFieldName = get(detector, 'by_field_name');
    if (partitionFieldName !== undefined) {
      const partitionFieldValue = get(entitiesState, partitionFieldName, '');
      entities.push({
        fieldType: 'partition_field',
        fieldName: partitionFieldName,
        fieldValue: partitionFieldValue,
      });
    }
    if (overFieldName !== undefined) {
      const overFieldValue = get(entitiesState, overFieldName, '');
      entities.push({
        fieldType: 'over_field',
        fieldName: overFieldName,
        fieldValue: overFieldValue,
      });
    }

    // For jobs with by and over fields, don't add the 'by' field as this
    // field will only be added to the top-level fields for record type results
    // if it also an influencer over the bucket.
    // TODO - metric data can be filtered by this field, so should only exclude
    // from filter for the anomaly records.
    if (byFieldName !== undefined && overFieldName === undefined) {
      const byFieldValue = get(entitiesState, byFieldName, '');
      entities.push({ fieldType: 'by_field', fieldName: byFieldName, fieldValue: byFieldValue });
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
            const { selectedJobId } = this.props;
            const jobs = createTimeSeriesJobData(mlJobService.jobs);
            const selectedJob = mlJobService.getJob(selectedJobId);

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

  componentDidUpdate(previousProps) {
    if (previousProps === undefined || previousProps.selectedJobId !== this.props.selectedJobId) {
      this.contextChartSelectedInitCallDone = false;
      this.setState({ fullRefresh: false, loading: true }, () => {
        this.loadForJobId(this.props.selectedJobId);
      });
    }

    if (
      previousProps === undefined ||
      previousProps.selectedJobId !== this.props.selectedJobId ||
      previousProps.selectedDetectorIndex !== this.props.selectedDetectorIndex ||
      !isEqual(previousProps.selectedEntities, this.props.selectedEntities)
    ) {
      const entityControls = this.getControlsForDetector();
      this.loadEntityValues(entityControls);
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

    if (
      previousProps === undefined ||
      !isEqual(previousProps.bounds, this.props.bounds) ||
      !isEqual(previousProps.lastRefresh, this.props.lastRefresh) ||
      !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
      !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
      previousProps.selectedForecastId !== this.props.selectedForecastId ||
      previousProps.selectedJobId !== this.props.selectedJobId
    ) {
      const fullRefresh =
        previousProps === undefined ||
        !isEqual(previousProps.bounds, this.props.bounds) ||
        !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
        !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
        previousProps.selectedForecastId !== this.props.selectedForecastId ||
        previousProps.selectedJobId !== this.props.selectedJobId;
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
  }

  componentWillUnmount() {
    this.subscriptions.unsubscribe();
    this.resizeChecker.destroy();
  }

  render() {
    const {
      autoZoomDuration,
      bounds,
      dateFormatTz,
      lastRefresh,
      selectedDetectorIndex,
      selectedJobId,
    } = this.props;

    const {
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

    const jobs = createTimeSeriesJobData(mlJobService.jobs);

    if (selectedDetectorIndex === undefined || mlJobService.getJob(selectedJobId) === undefined) {
      return <TimeSeriesExplorerPage dateFormatTz={dateFormatTz} resizeRef={this.resizeRef} />;
    }

    const selectedJob = mlJobService.getJob(selectedJobId);
    const entityControls = this.getControlsForDetector();
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    const arePartitioningFieldsProvided = this.arePartitioningFieldsProvided();

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
      this.props.previousRefresh === lastRefresh
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
        dateFormatTz={dateFormatTz}
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
                  data-test-subj="mlSingleMetricViewerDetectorSelect"
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
                  isLoading={this.state.entitiesLoading}
                  onSearchChange={this.entityFieldSearchChanged}
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
                    setForecastId={this.setForecastId}
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
            <div>
              {/* Make sure ChartTooltip is inside this plain wrapping element without padding so positioning can be inferred correctly. */}
              <ChartTooltip />
              <EuiText className="results-container">
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
            </div>
          )}
        {arePartitioningFieldsProvided && jobs.length > 0 && hasResults === true && (
          <AnomaliesTable bounds={bounds} tableData={tableData} filter={this.tableFilter} />
        )}
      </TimeSeriesExplorerPage>
    );
  }
}
