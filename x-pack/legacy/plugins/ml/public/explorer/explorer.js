/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { createRef } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import DragSelect from 'dragselect/dist/ds.min.js';
import { Subscription, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { annotationsRefresh$ } from '../services/annotations_service';
import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import {
  ExplorerNoInfluencersFound,
  ExplorerNoJobsFound,
  ExplorerNoResultsFound,
} from './components';
import { ChartTooltip } from '../components/chart_tooltip';
import { ExplorerSwimlane } from './explorer_swimlane';
import { KqlFilterBar } from '../components/kql_filter_bar';
import { TimeBuckets } from '../util/time_buckets';
import { getSelectedJobIds } from '../components/job_selector/job_select_service_utils';
import { InfluencersList } from '../components/influencers_list';
import {
  ALLOW_CELL_RANGE_SELECTION,
  dragSelect$,
  getExplorerDefaultState,
  explorer$,
  explorerAction$,
  explorerState$,
} from './explorer_dashboard_service';
import { mlResultsService } from '../services/results_service';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { NavigationMenu } from '../components/navigation_menu';
import { CheckboxShowCharts, showCharts$ } from '../components/controls/checkbox_showcharts';
import { JobSelector } from '../components/job_selector';
import { SelectInterval, interval$ } from '../components/controls/select_interval/select_interval';
import { SelectLimit, limit$ } from './select_limit/select_limit';
import { SelectSeverity, severity$ } from '../components/controls/select_severity/select_severity';
import { injectObservablesAsProps } from '../util/observable_utils';
import {
  getKqlQueryValues,
  removeFilterFromQueryString,
  getQueryPattern,
  escapeParens,
  escapeDoubleQuotes
} from '../components/kql_filter_bar/utils';
import { mlJobService } from '../services/job_service';

import { jobSelectionActionCreator, loadOverallDataActionCreator } from './actions';
import {
  getClearedSelectedAnomaliesState,
  getDateFormatTz,
  getFilteredTopInfluencers,
  getSelectionInfluencers,
  getSelectionTimeRange,
  getSwimlaneBucketInterval,
  getViewBySwimlaneOptions,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadDataForCharts,
  loadTopInfluencers,
  getInfluencers,
} from './explorer_utils';
import {
  explorerChartsContainerServiceFactory,
  getDefaultChartsData
} from './explorer_charts/explorer_charts_container_service';
import { getSwimlaneContainerWidth } from './legacy_utils';

import {
  DRAG_SELECT_ACTION,
  EXPLORER_ACTION,
  FILTER_ACTION,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';

import { ResizeChecker } from '../../../../../../src/plugins/kibana_utils/public';
import { timefilter } from 'ui/timefilter';
import { toastNotifications } from 'ui/notify';

import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

function mapSwimlaneOptionsToEuiOptions(options) {
  return options.map(option => ({
    value: option,
    text: option,
  }));
}

const ExplorerPage = ({ children, jobSelectorProps, resizeRef }) => (
  <div ref={resizeRef}>
    <NavigationMenu tabId="explorer" />
    <JobSelector {...jobSelectorProps} />
    {children}
  </div>
);

export const Explorer = injectI18n(injectObservablesAsProps(
  {
    annotationsRefresh: annotationsRefresh$,
    explorerState: explorerState$,
    explorer: explorer$,
    showCharts: showCharts$,
    swimlaneLimit: limit$.pipe(map(d => d.val)),
    tableInterval: interval$.pipe(map(d => d.val)),
    tableSeverity: severity$.pipe(map(d => d.val)),
  },
  class Explorer extends React.Component {
    static propTypes = {
      annotationsRefresh: PropTypes.bool,
      explorerState: PropTypes.object.isRequired,
      explorer: PropTypes.object,
      globalState: PropTypes.object.isRequired,
      jobSelectService$: PropTypes.object.isRequired,
      showCharts: PropTypes.bool.isRequired,
      swimlaneLimit: PropTypes.number.isRequired,
      tableInterval: PropTypes.string.isRequired,
      tableSeverity: PropTypes.number.isRequired,
    };

    _unsubscribeAll = new Subject();

    state = getExplorerDefaultState();

    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    disableDragSelectOnMouseLeave = true;

    // initialize an empty callback, this will be set in componentDidMount()
    updateCharts = () => {};

    dragSelect = new DragSelect({
      selectables: document.getElementsByClassName('sl-cell'),
      callback(elements) {
        if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
          elements = [elements[0]];
        }

        if (elements.length > 0) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.NEW_SELECTION,
            elements
          });
        }

        this.disableDragSelectOnMouseLeave = true;
      },
      onDragStart() {
        if (ALLOW_CELL_RANGE_SELECTION) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.DRAG_START
          });
          this.disableDragSelectOnMouseLeave = false;
        }
      },
      onElementSelect() {
        if (ALLOW_CELL_RANGE_SELECTION) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.ELEMENT_SELECT
          });
        }
      }
    });

    // Listens to render updates of the swimlanes to update dragSelect
    swimlaneRenderDoneListener = () => {
      this.dragSelect.clearSelection();
      this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
    };

    resizeRef = createRef();
    resizeChecker = undefined;
    resizeHandler = () => {
      explorerAction$.next({ type: EXPLORER_ACTION.REDRAW });
    }

    subscriptions = new Subscription();
    jobSelectionUpdateInProgress = false;

    componentDidMount() {
      timefilter.enableTimeRangeSelector();
      timefilter.enableAutoRefreshSelector();

      this.updateCharts = explorerChartsContainerServiceFactory((data) => {
        this.setState({
          chartsData: {
            ...getDefaultChartsData(),
            chartsPerRow: data.chartsPerRow,
            seriesToPlot: data.seriesToPlot,
            // convert truthy/falsy value to Boolean
            tooManyBuckets: !!data.tooManyBuckets,
          }
        });
      });

      mlTimefilterRefresh$.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => {
        this.resetCache();
        this.updateExplorer();
      });

      // Refresh all the data when the time range is altered.
      this.subscriptions.add(timefilter.getFetch$().subscribe(() => {
        this.resetCache();
        this.updateExplorer();
      }));

      // Required to redraw the time series chart when the container is resized.
      this.resizeChecker = new ResizeChecker(this.resizeRef.current);
      this.resizeChecker.on('resize', () => {
        this.resizeHandler();
      });
      this.resizeHandler();

      // restore state stored in URL via AppState and subscribe to
      // job updates via job selector.
      if (mlJobService.jobs.length > 0) {
        let initialized = false;

        this.subscriptions.add(this.props.jobSelectService$.subscribe(({ selection }) => {
          if (selection !== undefined) {
            const actionType = initialized ? EXPLORER_ACTION.JOB_SELECTION_CHANGE : EXPLORER_ACTION.INITIALIZE;
            explorerAction$.next(jobSelectionActionCreator(actionType, selection, this.props.explorerState.appState));

            initialized = true;
          }

        }));

      } else {
        explorerAction$.next({
          type: EXPLORER_ACTION.RELOAD,
          payload: {
            loading: false,
            noJobsFound: true,
          }
        });
      }
    }

    componentWillUnmount() {
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
      this.subscriptions.unsubscribe();
      this.resizeChecker.destroy();
    }

    resetCache() {
      this.topFieldsPreviousArgs = null;
      this.annotationsTablePreviousArgs = null;
      this.anomaliesTablePreviousArgs = null;
    }

    // based on the pattern described here:
    // https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#fetching-external-data-when-props-change
    // instead of our previous approach using custom listeners, here we react to prop changes
    // and trigger corresponding updates to the component's state via updateExplorer()
    previousSwimlaneLimit = limit$.getValue().val;
    previousTableInterval = interval$.getValue().val;
    previousTableSeverity = severity$.getValue().val;
    async componentDidUpdate() {
      if (this.props.explorer !== null && this.props.explorer.type !== EXPLORER_ACTION.IDLE) {
        const { type, payload } = this.props.explorer;

        if (type === EXPLORER_ACTION.INITIALIZE) {
          const { noJobsFound, selectedCells, selectedJobs, swimlaneViewByFieldName, filterData } = payload;
          let currentSelectedCells = this.state.selectedCells;
          let currentSwimlaneViewByFieldName = this.state.swimlaneViewByFieldName;

          if (swimlaneViewByFieldName !== undefined) {
            currentSwimlaneViewByFieldName = swimlaneViewByFieldName;
          }

          if (selectedCells !== undefined && currentSelectedCells === null) {
            currentSelectedCells = selectedCells;
          }

          const stateUpdate = {
            noInfluencersConfigured: (getInfluencers(selectedJobs).length === 0),
            noJobsFound,
            selectedCells: currentSelectedCells,
            selectedJobs,
            swimlaneViewByFieldName: currentSwimlaneViewByFieldName
          };

          if (filterData.influencersFilterQuery !== undefined) {
            Object.assign(stateUpdate, { ...filterData });
          }

          const indexPattern = await this.getIndexPattern(selectedJobs);
          stateUpdate.indexPattern = indexPattern;

          this.updateExplorer(stateUpdate, true);
          explorerAction$.next({ type: EXPLORER_ACTION.IDLE });
          return;
        }

        // Listen for changes to job selection.
        if (type === EXPLORER_ACTION.JOB_SELECTION_CHANGE) {
          const { selectedJobs } = payload;
          const stateUpdate = {
            noInfluencersConfigured: (getInfluencers(selectedJobs).length === 0),
            selectedJobs,
          };

          explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
          Object.assign(stateUpdate, getClearedSelectedAnomaliesState());
          // clear filter if selected jobs have no influencers
          if (stateUpdate.noInfluencersConfigured === true) {
            explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS });
            const noFilterState = {
              filterActive: false,
              filteredFields: [],
              influencersFilterQuery: undefined,
              maskAll: false,
              queryString: '',
              tableQueryString: ''
            };

            Object.assign(stateUpdate, noFilterState);
          } else {
            // indexPattern will not be used if there are no influencers so set up can be skipped
            // indexPattern is passed to KqlFilterBar which is only shown if (noInfluencersConfigured === false)
            const indexPattern = await this.getIndexPattern(selectedJobs);
            stateUpdate.indexPattern = indexPattern;
          }

          if (selectedJobs.length > 1) {
            explorerAction$.next({
              type: EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
              payload: { swimlaneViewByFieldName: VIEW_BY_JOB_LABEL }
            });
            stateUpdate.swimlaneViewByFieldName = VIEW_BY_JOB_LABEL;
            // enforce a state update for swimlaneViewByFieldName
            this.setState({ swimlaneViewByFieldName: VIEW_BY_JOB_LABEL }, () => {
              this.updateExplorer(stateUpdate, true);
            });
            return;
          }
          this.updateExplorer(stateUpdate, true);
          explorerAction$.next({ type: EXPLORER_ACTION.IDLE });

          return;
        }

        // RELOAD reloads full Anomaly Explorer and clears the selection.
        if (type === EXPLORER_ACTION.RELOAD) {
          explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
          this.updateExplorer({ ...payload, ...getClearedSelectedAnomaliesState() }, true);
          explorerAction$.next({ type: EXPLORER_ACTION.IDLE });
          return;
        }

        // REDRAW reloads Anomaly Explorer and tries to retain the selection.
        if (type === EXPLORER_ACTION.REDRAW) {
          this.updateExplorer({}, false);
          explorerAction$.next({ type: EXPLORER_ACTION.IDLE });
          return;
        }
      } else if (this.previousSwimlaneLimit !== this.props.swimlaneLimit) {
        this.previousSwimlaneLimit = this.props.swimlaneLimit;
        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
        this.updateExplorer(getClearedSelectedAnomaliesState(), false);
      } else if (this.previousTableInterval !== this.props.tableInterval) {
        this.previousTableInterval = this.props.tableInterval;
        this.updateExplorer();
      } else if (this.previousTableSeverity !== this.props.tableSeverity) {
        this.previousTableSeverity = this.props.tableSeverity;
        this.updateExplorer();
      } else if (this.props.annotationsRefresh === true) {
        annotationsRefresh$.next(false);
        // clear the annotations cache and trigger an update
        this.annotationsTablePreviousArgs = null;
        this.annotationsTablePreviousData = [];
        this.updateExplorer();
      }
    }

    // Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
    // Field objects required fields: name, type, aggregatable, searchable
    async getIndexPattern(selectedJobs) {
      const { indexPattern } = this.state;
      const influencers = getInfluencers(selectedJobs);

      indexPattern.fields = influencers.map((influencer) => ({
        name: influencer,
        type: 'string',
        aggregatable: true,
        searchable: true
      }));

      return indexPattern;
    }

    topFieldsPreviousArgs = null;
    topFieldsPreviousData = null;
    loadViewByTopFieldValuesForSelectedTime(earliestMs, latestMs, selectedJobs, swimlaneViewByFieldName) {
      const selectedJobIds = selectedJobs.map(d => d.id);
      const { swimlaneLimit } = this.props;

      const compareArgs = {
        earliestMs, latestMs, selectedJobIds, swimlaneLimit, swimlaneViewByFieldName,
        interval: getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds()
      };

      // Find the top field values for the selected time, and then load the 'view by'
      // swimlane over the full time range for those specific field values.
      return new Promise((resolve) => {
        if (_.isEqual(compareArgs, this.topFieldsPreviousArgs)) {
          resolve(this.topFieldsPreviousData);
          return;
        }
        this.topFieldsPreviousArgs = compareArgs;

        if (swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
          mlResultsService.getTopInfluencers(
            selectedJobIds,
            earliestMs,
            latestMs,
            swimlaneLimit
          ).then((resp) => {
            if (resp.influencers[swimlaneViewByFieldName] === undefined) {
              this.topFieldsPreviousData = [];
              resolve([]);
            }

            const topFieldValues = [];
            const topInfluencers = resp.influencers[swimlaneViewByFieldName];
            topInfluencers.forEach((influencerData) => {
              if (influencerData.maxAnomalyScore > 0) {
                topFieldValues.push(influencerData.influencerFieldValue);
              }
            });
            this.topFieldsPreviousData = topFieldValues;
            resolve(topFieldValues);
          });
        } else {
          mlResultsService.getScoresByBucket(
            selectedJobIds,
            earliestMs,
            latestMs,
            getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds() + 's',
            swimlaneLimit
          ).then((resp) => {
            const topFieldValues = Object.keys(resp.results);
            this.topFieldsPreviousData = topFieldValues;
            resolve(topFieldValues);
          });
        }
      });
    }

    anomaliesTablePreviousArgs = null;
    anomaliesTablePreviousData = null;
    annotationsTablePreviousArgs = null;
    annotationsTablePreviousData = [];
    async updateExplorer(stateUpdate = {}, showOverallLoadingIndicator = true) {
      const {
        filterActive,
        filteredFields,
        influencersFilterQuery,
        isAndOperator,
        noInfluencersConfigured,
        noJobsFound,
        selectedCells,
        selectedJobs,
        swimlaneViewByFieldName,
      } = {
        ...this.state,
        ...stateUpdate
      };

      if (noJobsFound) {
        this.setState(stateUpdate);
        return;
      }

      const jobIds = (selectedCells !== null && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL)
        ? selectedCells.lanes
        : selectedJobs.map(d => d.id);

      const bounds = timefilter.getActiveBounds();
      const timerange = getSelectionTimeRange(
        selectedCells,
        getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds(),
        bounds,
      );

      const viewBySwimlaneOptions = getViewBySwimlaneOptions({
        currentSwimlaneViewByFieldName: swimlaneViewByFieldName,
        filterActive,
        filteredFields,
        isAndOperator,
        selectedJobs,
        selectedCells
      });

      // Load the overall data - if the FieldFormats failed to populate
      // the default formatting will be used for metric values.
      explorerAction$.next(loadOverallDataActionCreator(
        selectedCells,
        selectedJobs,
        getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)),
        bounds,
        showOverallLoadingIndicator,
        viewBySwimlaneOptions,
        influencersFilterQuery,
        timerange,
        this.props.swimlaneLimit,
        this.state.noInfluencersConfigured,
        filterActive
      ));

      const annotationsTableCompareArgs = {
        selectedCells,
        selectedJobs,
        interval: getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)),
        boundsMin: bounds.min.valueOf(),
        boundsMax: bounds.max.valueOf(),
      };

      if (_.isEqual(annotationsTableCompareArgs, this.annotationsTablePreviousArgs)) {
        stateUpdate.annotationsData = this.annotationsTablePreviousData;
      } else {
        this.annotationsTablePreviousArgs = annotationsTableCompareArgs;
        stateUpdate.annotationsData = this.annotationsTablePreviousData = await loadAnnotationsTableData(
          selectedCells,
          selectedJobs,
          getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds(),
          bounds,
        );
      }

      const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneOptions.swimlaneViewByFieldName);

      if (selectionInfluencers.length === 0) {
        stateUpdate.influencers = await loadTopInfluencers(jobIds, timerange.earliestMs, timerange.latestMs, noInfluencersConfigured);
      }

      if (stateUpdate.influencers !== undefined && !noInfluencersConfigured) {
        for (const influencerName in stateUpdate.influencers) {
          if (stateUpdate.influencers[influencerName][0] && stateUpdate.influencers[influencerName][0].influencerFieldValue) {
            stateUpdate.filterPlaceHolder =
                  (i18n.translate(
                    'xpack.ml.explorer.kueryBar.filterPlaceholder',
                    {
                      defaultMessage:
                  'Filter by influencer fields… ({queryExample})',
                      values: {
                        queryExample:
                    `${influencerName} : ${stateUpdate.influencers[influencerName][0].influencerFieldValue}`
                      }
                    }
                  ));
            break;
          }
        }
      }

      const updatedAnomalyChartRecords = await loadDataForCharts(
        jobIds, timerange.earliestMs, timerange.latestMs, selectionInfluencers, selectedCells, influencersFilterQuery
      );

      if ((selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) && updatedAnomalyChartRecords !== undefined) {
        stateUpdate.influencers = await getFilteredTopInfluencers(
          jobIds,
          timerange.earliestMs,
          timerange.latestMs,
          updatedAnomalyChartRecords,
          selectionInfluencers,
          noInfluencersConfigured,
          influencersFilterQuery
        );
      }

      stateUpdate.anomalyChartRecords = updatedAnomalyChartRecords || [];

      this.setState(stateUpdate);

      if (selectedCells !== null) {
        this.updateCharts(
          stateUpdate.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      } else {
        this.updateCharts(
          [], timerange.earliestMs, timerange.latestMs
        );
      }

      const { tableInterval, tableSeverity } = this.props;
      const dateFormatTz = getDateFormatTz();

      const anomaliesTableCompareArgs = {
        selectedCells,
        selectedJobs,
        dateFormatTz,
        interval: getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds(),
        boundsMin: bounds.min.valueOf(),
        boundsMax: bounds.max.valueOf(),
        swimlaneViewByFieldName: viewBySwimlaneOptions.swimlaneViewByFieldName,
        tableInterval,
        tableSeverity,
        influencersFilterQuery
      };

      if (_.isEqual(anomaliesTableCompareArgs, this.anomaliesTablePreviousArgs)) {
        this.setState(this.anomaliesTablePreviousData);
      } else {
        this.anomaliesTablePreviousArgs = anomaliesTableCompareArgs;
        const tableData = this.anomaliesTablePreviousData = await loadAnomaliesTableData(
          selectedCells,
          selectedJobs,
          dateFormatTz,
          getSwimlaneBucketInterval(selectedJobs, getSwimlaneContainerWidth(this.state.noInfluencersConfigured)).asSeconds(),
          bounds,
          viewBySwimlaneOptions.swimlaneViewByFieldName,
          tableInterval,
          tableSeverity,
          influencersFilterQuery
        );
        this.setState({ tableData });
      }
    }

    viewByChangeHandler = e => this.setSwimlaneViewBy(e.target.value);
    setSwimlaneViewBy = (swimlaneViewByFieldName) => {
      let maskAll = false;

      if (this.state.influencersFilterQuery !== undefined) {
        maskAll = (swimlaneViewByFieldName === VIEW_BY_JOB_LABEL ||
          this.state.filteredFields.includes(swimlaneViewByFieldName) === false);
      }

      explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
      explorerAction$.next({
        type: EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
        payload: { swimlaneViewByFieldName }
      });
      this.setState({ swimlaneViewByFieldName, maskAll }, () => {
        this.updateExplorer({
          swimlaneViewByFieldName,
          ...getClearedSelectedAnomaliesState(),
        }, false);
      });
    };

    isSwimlaneSelectActive = false;
    onSwimlaneEnterHandler = () => this.setSwimlaneSelectActive(true);
    onSwimlaneLeaveHandler = () => this.setSwimlaneSelectActive(false);
    setSwimlaneSelectActive = (active) => {
      if (this.isSwimlaneSelectActive && !active && this.disableDragSelectOnMouseLeave) {
        this.dragSelect.stop();
        this.isSwimlaneSelectActive = active;
        return;
      }
      if (!this.isSwimlaneSelectActive && active) {
        this.dragSelect.start();
        this.dragSelect.clearSelection();
        this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
        this.isSwimlaneSelectActive = active;
      }
    };

    // Listener for click events in the swimlane to load corresponding anomaly data.
    swimlaneCellClick = (swimlaneSelectedCells) => {
      // If selectedCells is an empty object we clear any existing selection,
      // otherwise we save the new selection in AppState and update the Explorer.
      if (Object.keys(swimlaneSelectedCells).length === 0) {
        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });

        const stateUpdate = getClearedSelectedAnomaliesState();
        this.updateExplorer(stateUpdate, false);
      } else {
        swimlaneSelectedCells.showTopFieldValues = false;

        const currentSwimlaneType = _.get(this.state, 'selectedCells.type');
        const currentShowTopFieldValues = _.get(this.state, 'selectedCells.showTopFieldValues', false);
        const newSwimlaneType = _.get(swimlaneSelectedCells, 'type');

        if (
          (currentSwimlaneType === SWIMLANE_TYPE.OVERALL && newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
          newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
          currentShowTopFieldValues === true
        ) {
          swimlaneSelectedCells.showTopFieldValues = true;
        }

        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_SAVE_SELECTION, payload: { swimlaneSelectedCells } });
        this.updateExplorer({ selectedCells: swimlaneSelectedCells }, false);
      }
    }
    // Escape regular parens from fieldName as that portion of the query is not wrapped in double quotes
    // and will cause a syntax error when called with getKqlQueryValues
    applyFilter = (fieldName, fieldValue, action) => {
      let newQueryString = '';
      const { queryString } = this.state;
      const operator = 'and ';
      const sanitizedFieldName = escapeParens(fieldName);
      const sanitizedFieldValue = escapeDoubleQuotes(fieldValue);

      if (action === FILTER_ACTION.ADD) {
        // Don't re-add if already exists in the query
        const queryPattern = getQueryPattern(fieldName, fieldValue);
        if (queryString.match(queryPattern) !== null) {
          return;
        }
        newQueryString = `${queryString ? `${queryString} ${operator}` : ''}${sanitizedFieldName}:"${sanitizedFieldValue}"`;
      } else if (action === FILTER_ACTION.REMOVE) {
        if (this.state.filterActive === false) {
          return;
        } else {
          newQueryString = removeFilterFromQueryString(this.state.queryString, sanitizedFieldName, sanitizedFieldValue);
        }
      }

      try {
        const queryValues = getKqlQueryValues(`${newQueryString}`, this.state.indexPattern);
        this.applyInfluencersFilterQuery(queryValues);
      } catch(e) {
        console.log('Invalid kuery syntax', e); // eslint-disable-line no-console

        toastNotifications.addDanger(this.props.intl.formatMessage({
          id: 'xpack.ml.explorer.invalidKuerySyntaxErrorMessageFromTable',
          defaultMessage: 'Invalid syntax in query bar. The input must be valid Kibana Query Language (KQL)'
        }));
      }
    }

    applyInfluencersFilterQuery = ({
      filterQuery: influencersFilterQuery,
      isAndOperator,
      filteredFields,
      queryString,
      tableQueryString }) => {
      const { viewBySwimlaneOptions } = this.props.explorerState;
      const { selectedCells, swimlaneViewByFieldName } = this.state;
      let selectedViewByFieldName = swimlaneViewByFieldName;

      if (influencersFilterQuery.match_all && Object.keys(influencersFilterQuery.match_all).length === 0) {
        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS });
        explorerAction$.next({ type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION });
        const stateUpdate = {
          filterActive: false,
          filteredFields: [],
          influencersFilterQuery: undefined,
          isAndOperator: false,
          maskAll: false,
          queryString: '',
          tableQueryString: '',
          ...getClearedSelectedAnomaliesState()
        };

        this.updateExplorer(stateUpdate, false);
      } else {
        // if it's an AND filter set view by swimlane to job ID as the others will have no results
        if (isAndOperator && selectedCells === null) {
          selectedViewByFieldName = VIEW_BY_JOB_LABEL;
          explorerAction$.next({
            type: EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
            payload: { swimlaneViewByFieldName: selectedViewByFieldName },
          });
        } else {
        // Set View by dropdown to first relevant fieldName based on incoming filter if there's no cell selection already
        // or if selected cell is from overall swimlane as this won't include an additional influencer filter
          for (let i = 0; i < filteredFields.length; i++) {
            if (viewBySwimlaneOptions.includes(filteredFields[i]) &&
                ((selectedCells === null || (selectedCells && selectedCells.type === 'overall')))) {
              selectedViewByFieldName = filteredFields[i];
              explorerAction$.next({
                type: EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
                payload: { swimlaneViewByFieldName: selectedViewByFieldName },
              });
              break;
            }
          }
        }

        explorerAction$.next({
          type: EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS,
          payload: { influencersFilterQuery, filterActive: true, filteredFields, queryString, tableQueryString, isAndOperator },
        });

        this.updateExplorer({
          filterActive: true,
          filteredFields,
          influencersFilterQuery,
          isAndOperator,
          queryString,
          tableQueryString,
          maskAll: (selectedViewByFieldName === VIEW_BY_JOB_LABEL ||
            filteredFields.includes(selectedViewByFieldName) === false),
          swimlaneViewByFieldName: selectedViewByFieldName
        }, false);
      }
    }

    render() {
      const {
        globalState,
        intl,
        jobSelectService$,
      } = this.props;

      const {
        annotationsData,
        anomalyChartRecords,
        chartsData,
        filterActive,
        filterPlaceHolder,
        indexPattern,
        maskAll,
        influencers,
        noInfluencersConfigured,
        noJobsFound,
        queryString,
        selectedCells,
        swimlaneViewByFieldName,
        tableData,
        tableQueryString,
      } = this.state;

      const {
        hasResults,
        overallSwimlaneData,
        viewByLoadedForTimeFormatted,
        viewBySwimlaneData,
        viewBySwimlaneDataLoading,
        viewBySwimlaneOptions,
      } = this.props.explorerState;

      const loading = this.props.explorerState.loading;

      const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);

      const { jobIds: selectedJobIds, selectedGroups } = getSelectedJobIds(globalState);
      const jobSelectorProps = {
        dateFormatTz: getDateFormatTz(),
        globalState,
        jobSelectService$,
        selectedJobIds,
        selectedGroups,
      };

      if (loading === true) {
        return (
          <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
            <LoadingIndicator
              label={intl.formatMessage({
                id: 'xpack.ml.explorer.loadingLabel',
                defaultMessage: 'Loading',
              })}
            />
          </ExplorerPage>
        );
      }

      if (noJobsFound) {
        return <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}><ExplorerNoJobsFound /></ExplorerPage>;
      }

      if (noJobsFound && hasResults === false) {
        return <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}><ExplorerNoResultsFound /></ExplorerPage>;
      }

      const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
      const mainColumnClasses = `column ${mainColumnWidthClassName}`;

      const showOverallSwimlane = (
        overallSwimlaneData !== null &&
        overallSwimlaneData.laneLabels &&
        overallSwimlaneData.laneLabels.length > 0
      );
      const showViewBySwimlane = (
        viewBySwimlaneData !== null &&
        viewBySwimlaneData.laneLabels &&
        viewBySwimlaneData.laneLabels.length > 0
      );

      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <div className="results-container">
            {/* Make sure ChartTooltip is inside this plain wrapping div so positioning can be infered correctly. */}
            <ChartTooltip />

            {noInfluencersConfigured === false &&
            influencers !== undefined &&
            <div className="mlAnomalyExplorer__filterBar">
              <KqlFilterBar
                indexPattern={indexPattern}
                onSubmit={this.applyInfluencersFilterQuery}
                initialValue={queryString}
                placeholder={filterPlaceHolder}
                valueExternal={tableQueryString}
              />
            </div>}

            {noInfluencersConfigured && (
              <div className="no-influencers-warning">
                <EuiIconTip
                  content={intl.formatMessage({
                    id: 'xpack.ml.explorer.noConfiguredInfluencersTooltip',
                    defaultMessage:
                    'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
                  })}
                  position="right"
                  type="iInCircle"
                />
              </div>
            )}

            {noInfluencersConfigured === false && (
              <div className="column col-xs-2 euiText" data-test-subj="mlAnomalyExplorerInfluencerList">
                <span className="panel-title">
                  <FormattedMessage
                    id="xpack.ml.explorer.topInfuencersTitle"
                    defaultMessage="Top Influencers"
                  />
                </span>
                <InfluencersList
                  influencers={influencers}
                  influencerFilter={this.applyFilter}
                />
              </div>
            )}

            <div className={mainColumnClasses}>
              <span className="panel-title euiText">
                <FormattedMessage
                  id="xpack.ml.explorer.anomalyTimelineTitle"
                  defaultMessage="Anomaly timeline"
                />
              </span>

              <div
                className="ml-explorer-swimlane euiText"
                onMouseEnter={this.onSwimlaneEnterHandler}
                onMouseLeave={this.onSwimlaneLeaveHandler}
                data-test-subj="mlAnomalyExplorerSwimlaneOverall"
              >
                {showOverallSwimlane && (
                  <ExplorerSwimlane
                    chartWidth={swimlaneWidth}
                    filterActive={filterActive}
                    maskAll={maskAll}
                    TimeBuckets={TimeBuckets}
                    swimlaneCellClick={this.swimlaneCellClick}
                    swimlaneData={overallSwimlaneData}
                    swimlaneType={SWIMLANE_TYPE.OVERALL}
                    selection={selectedCells}
                    swimlaneRenderDoneListener={this.swimlaneRenderDoneListener}
                  />
                )}
              </div>

              {viewBySwimlaneOptions.length > 0 && (
                <>
                  <EuiFlexGroup direction="row" gutterSize="l" responsive={true}>
                    <EuiFlexItem grow={false}>
                      <EuiFormRow
                        label={intl.formatMessage({
                          id: 'xpack.ml.explorer.viewByLabel',
                          defaultMessage: 'View by',
                        })}
                      >
                        <EuiSelect
                          id="selectViewBy"
                          options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                          value={swimlaneViewByFieldName}
                          onChange={this.viewByChangeHandler}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFormRow
                        label={intl.formatMessage({
                          id: 'xpack.ml.explorer.limitLabel',
                          defaultMessage: 'Limit',
                        })}
                      >
                        <SelectLimit />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                      <EuiFormRow label="&#8203;">
                        <div className="panel-sub-title">
                          {viewByLoadedForTimeFormatted && (
                            <FormattedMessage
                              id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                              defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                              values={{ viewByLoadedForTimeFormatted }}
                            />
                          )}
                          {viewByLoadedForTimeFormatted === undefined && (
                            <FormattedMessage
                              id="xpack.ml.explorer.sortedByMaxAnomalyScoreLabel"
                              defaultMessage="(Sorted by max anomaly score)"
                            />
                          )}
                          {filterActive === true &&
                          swimlaneViewByFieldName === 'job ID' && (
                            <FormattedMessage
                              id="xpack.ml.explorer.jobScoreAcrossAllInfluencersLabel"
                              defaultMessage="(Job score across all influencers)"
                            />
                          )}
                        </div>
                      </EuiFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {showViewBySwimlane && (
                    <>
                      <EuiSpacer size="m" />
                      <div
                        className="ml-explorer-swimlane euiText"
                        onMouseEnter={this.onSwimlaneEnterHandler}
                        onMouseLeave={this.onSwimlaneLeaveHandler}
                        data-test-subj="mlAnomalyExplorerSwimlaneViewBy"
                      >
                        <ExplorerSwimlane
                          chartWidth={swimlaneWidth}
                          filterActive={filterActive}
                          maskAll={maskAll}
                          TimeBuckets={TimeBuckets}
                          swimlaneCellClick={this.swimlaneCellClick}
                          swimlaneData={viewBySwimlaneData}
                          swimlaneType={SWIMLANE_TYPE.VIEW_BY}
                          selection={selectedCells}
                          swimlaneRenderDoneListener={this.swimlaneRenderDoneListener}
                        />
                      </div>
                    </>
                  )}

                  {viewBySwimlaneDataLoading && (
                    <LoadingIndicator/>
                  )}

                  {!showViewBySwimlane && !viewBySwimlaneDataLoading && swimlaneViewByFieldName !== null && (
                    <ExplorerNoInfluencersFound
                      swimlaneViewByFieldName={swimlaneViewByFieldName}
                      showFilterMessage={(filterActive === true)}
                    />
                  )}
                </>
              )}

              {annotationsData.length > 0 && (
                <>
                  <span className="panel-title euiText">
                    <FormattedMessage
                      id="xpack.ml.explorer.annotationsTitle"
                      defaultMessage="Annotations"
                    />
                  </span>
                  <AnnotationsTable
                    annotations={annotationsData}
                    drillDown={true}
                    numberBadge={false}
                  />
                  <AnnotationFlyout />
                  <EuiSpacer size="l" />
                </>
              )}

              <span className="panel-title euiText">
                <FormattedMessage id="xpack.ml.explorer.anomaliesTitle" defaultMessage="Anomalies" />
              </span>

              <EuiFlexGroup
                direction="row"
                gutterSize="l"
                responsive={true}
                className="ml-anomalies-controls"
              >
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={intl.formatMessage({
                      id: 'xpack.ml.explorer.severityThresholdLabel',
                      defaultMessage: 'Severity threshold',
                    })}
                  >
                    <SelectSeverity />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={intl.formatMessage({
                      id: 'xpack.ml.explorer.intervalLabel',
                      defaultMessage: 'Interval',
                    })}
                  >
                    <SelectInterval />
                  </EuiFormRow>
                </EuiFlexItem>
                {(anomalyChartRecords.length > 0 && selectedCells !== null) && (
                  <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                    <EuiFormRow label="&#8203;">
                      <CheckboxShowCharts />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              <div className="euiText explorer-charts">
                {this.props.showCharts && <ExplorerChartsContainer {...chartsData} />}
              </div>

              <AnomaliesTable
                tableData={tableData}
                timefilter={timefilter}
                influencerFilter={this.applyFilter}
              />
            </div>
          </div>
        </ExplorerPage>
      );
    }
  }
));
