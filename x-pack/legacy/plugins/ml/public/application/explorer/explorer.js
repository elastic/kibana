/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React, { createRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import DragSelect from 'dragselect/dist/ds.min.js';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPage,
  EuiPageBody,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

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
import { InfluencersList } from '../components/influencers_list';
import {
  ALLOW_CELL_RANGE_SELECTION,
  dragSelect$,
  explorerService,
} from './explorer_dashboard_service';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { NavigationMenu } from '../components/navigation_menu';
import { CheckboxShowCharts } from '../components/controls/checkbox_showcharts';
import { JobSelector } from '../components/job_selector';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectLimit, limit$ } from './select_limit/select_limit';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import {
  getKqlQueryValues,
  removeFilterFromQueryString,
  getQueryPattern,
  escapeParens,
  escapeDoubleQuotes,
} from '../components/kql_filter_bar/utils';

import { getDateFormatTz } from './explorer_utils';
import { getSwimlaneContainerWidth } from './legacy_utils';

import {
  DRAG_SELECT_ACTION,
  FILTER_ACTION,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';

import { ResizeChecker } from '../../../../../../../src/plugins/kibana_utils/public';
import { getTimefilter, getToastNotifications } from '../util/dependency_cache';

function mapSwimlaneOptionsToEuiOptions(options) {
  return options.map(option => ({
    value: option,
    text: option,
  }));
}

const ExplorerPage = ({ children, jobSelectorProps, resizeRef }) => (
  <div ref={resizeRef} data-test-subj="mlPageAnomalyExplorer">
    <NavigationMenu tabId="explorer" />
    <EuiPage style={{ padding: '0px', background: 'none' }}>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage id="xpack.ml.explorer.pageTitle" defaultMessage="Anomaly Explorer" />
          </h1>
        </EuiScreenReaderOnly>
        <JobSelector {...jobSelectorProps} />
        {children}
      </EuiPageBody>
    </EuiPage>
  </div>
);

export class Explorer extends React.Component {
  static propTypes = {
    explorerState: PropTypes.object.isRequired,
    setSelectedCells: PropTypes.func.isRequired,
    severity: PropTypes.number.isRequired,
    showCharts: PropTypes.bool.isRequired,
  };

  _unsubscribeAll = new Subject();
  // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
  disableDragSelectOnMouseLeave = true;

  dragSelect = new DragSelect({
    selectables: document.getElementsByClassName('sl-cell'),
    callback(elements) {
      if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
        elements = [elements[0]];
      }

      if (elements.length > 0) {
        dragSelect$.next({
          action: DRAG_SELECT_ACTION.NEW_SELECTION,
          elements,
        });
      }

      this.disableDragSelectOnMouseLeave = true;
    },
    onDragStart(e) {
      let target = e.target;
      while (target && target !== document.body && !target.classList.contains('sl-cell')) {
        target = target.parentNode;
      }
      if (ALLOW_CELL_RANGE_SELECTION && target !== document.body) {
        dragSelect$.next({
          action: DRAG_SELECT_ACTION.DRAG_START,
        });
        this.disableDragSelectOnMouseLeave = false;
      }
    },
    onElementSelect() {
      if (ALLOW_CELL_RANGE_SELECTION) {
        dragSelect$.next({
          action: DRAG_SELECT_ACTION.ELEMENT_SELECT,
        });
      }
    },
  });

  // Listens to render updates of the swimlanes to update dragSelect
  swimlaneRenderDoneListener = () => {
    this.dragSelect.clearSelection();
    this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
  };

  resizeRef = createRef();
  resizeChecker = undefined;
  resizeHandler = () => {
    explorerService.setSwimlaneContainerWidth(getSwimlaneContainerWidth());
  };

  componentDidMount() {
    limit$
      .pipe(
        takeUntil(this._unsubscribeAll),
        map(d => d.val)
      )
      .subscribe(explorerService.setSwimlaneLimit);

    // Required to redraw the time series chart when the container is resized.
    this.resizeChecker = new ResizeChecker(this.resizeRef.current);
    this.resizeChecker.on('resize', this.resizeHandler);
  }

  componentWillUnmount() {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.resizeChecker.destroy();
  }

  resetCache() {
    this.anomaliesTablePreviousArgs = null;
  }

  viewByChangeHandler = e => explorerService.setViewBySwimlaneFieldName(e.target.value);

  isSwimlaneSelectActive = false;
  onSwimlaneEnterHandler = () => this.setSwimlaneSelectActive(true);
  onSwimlaneLeaveHandler = () => this.setSwimlaneSelectActive(false);
  setSwimlaneSelectActive = active => {
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
  swimlaneCellClick = selectedCells => {
    // If selectedCells is an empty object we clear any existing selection,
    // otherwise we save the new selection in AppState and update the Explorer.
    if (Object.keys(selectedCells).length === 0) {
      this.props.setSelectedCells();
    } else {
      this.props.setSelectedCells(selectedCells);
    }
  };
  // Escape regular parens from fieldName as that portion of the query is not wrapped in double quotes
  // and will cause a syntax error when called with getKqlQueryValues
  applyFilter = (fieldName, fieldValue, action) => {
    const { filterActive, indexPattern, queryString } = this.props.explorerState;

    let newQueryString = '';
    const operator = 'and ';
    const sanitizedFieldName = escapeParens(fieldName);
    const sanitizedFieldValue = escapeDoubleQuotes(fieldValue);

    if (action === FILTER_ACTION.ADD) {
      // Don't re-add if already exists in the query
      const queryPattern = getQueryPattern(fieldName, fieldValue);
      if (queryString.match(queryPattern) !== null) {
        return;
      }
      newQueryString = `${
        queryString ? `${queryString} ${operator}` : ''
      }${sanitizedFieldName}:"${sanitizedFieldValue}"`;
    } else if (action === FILTER_ACTION.REMOVE) {
      if (filterActive === false) {
        return;
      } else {
        newQueryString = removeFilterFromQueryString(
          queryString,
          sanitizedFieldName,
          sanitizedFieldValue
        );
      }
    }

    try {
      const queryValues = getKqlQueryValues(`${newQueryString}`, indexPattern);
      this.applyInfluencersFilterQuery(queryValues);
    } catch (e) {
      console.log('Invalid kuery syntax', e); // eslint-disable-line no-console

      const toastNotifications = getToastNotifications();
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessageFromTable', {
          defaultMessage:
            'Invalid syntax in query bar. The input must be valid Kibana Query Language (KQL)',
        })
      );
    }
  };

  applyInfluencersFilterQuery = payload => {
    const { filterQuery: influencersFilterQuery } = payload;

    if (
      influencersFilterQuery.match_all &&
      Object.keys(influencersFilterQuery.match_all).length === 0
    ) {
      explorerService.clearInfluencerFilterSettings();
    } else {
      explorerService.setInfluencerFilterSettings(payload);
    }
  };

  render() {
    const { showCharts, severity } = this.props;

    const {
      annotationsData,
      chartsData,
      filterActive,
      filterPlaceHolder,
      indexPattern,
      influencers,
      loading,
      maskAll,
      noInfluencersConfigured,
      overallSwimlaneData,
      queryString,
      selectedCells,
      selectedJobs,
      swimlaneContainerWidth,
      tableData,
      tableQueryString,
      viewByLoadedForTimeFormatted,
      viewBySwimlaneData,
      viewBySwimlaneDataLoading,
      viewBySwimlaneFieldName,
      viewBySwimlaneOptions,
    } = this.props.explorerState;

    const jobSelectorProps = {
      dateFormatTz: getDateFormatTz(),
    };

    const noJobsFound = selectedJobs === null || selectedJobs.length === 0;
    const hasResults = overallSwimlaneData.points && overallSwimlaneData.points.length > 0;

    if (loading === true) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <LoadingIndicator
            label={i18n.translate('xpack.ml.explorer.loadingLabel', {
              defaultMessage: 'Loading',
            })}
          />
        </ExplorerPage>
      );
    }

    if (noJobsFound) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <ExplorerNoJobsFound />
        </ExplorerPage>
      );
    }

    if (noJobsFound && hasResults === false) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
          <ExplorerNoResultsFound />
        </ExplorerPage>
      );
    }

    const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
    const mainColumnClasses = `column ${mainColumnWidthClassName}`;

    const showOverallSwimlane =
      overallSwimlaneData !== null &&
      overallSwimlaneData.laneLabels &&
      overallSwimlaneData.laneLabels.length > 0;
    const showViewBySwimlane =
      viewBySwimlaneData !== null &&
      viewBySwimlaneData.laneLabels &&
      viewBySwimlaneData.laneLabels.length > 0;

    const timefilter = getTimefilter();
    const bounds = timefilter.getActiveBounds();

    return (
      <ExplorerPage jobSelectorProps={jobSelectorProps} resizeRef={this.resizeRef}>
        <div className="results-container">
          {/* Make sure ChartTooltip is inside wrapping div with 0px left/right padding so positioning can be inferred correctly. */}
          <ChartTooltip />

          {noInfluencersConfigured === false && influencers !== undefined && (
            <div className="mlAnomalyExplorer__filterBar">
              <KqlFilterBar
                indexPattern={indexPattern}
                onSubmit={this.applyInfluencersFilterQuery}
                initialValue={queryString}
                placeholder={filterPlaceHolder}
                valueExternal={tableQueryString}
              />
            </div>
          )}

          {noInfluencersConfigured && (
            <div className="no-influencers-warning">
              <EuiIconTip
                content={i18n.translate('xpack.ml.explorer.noConfiguredInfluencersTooltip', {
                  defaultMessage:
                    'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
                })}
                position="right"
                type="iInCircle"
              />
            </div>
          )}

          {noInfluencersConfigured === false && (
            <div className="column col-xs-2" data-test-subj="mlAnomalyExplorerInfluencerList">
              <EuiTitle className="panel-title">
                <h2>
                  <FormattedMessage
                    id="xpack.ml.explorer.topInfuencersTitle"
                    defaultMessage="Top influencers"
                  />
                </h2>
              </EuiTitle>
              <InfluencersList influencers={influencers} influencerFilter={this.applyFilter} />
            </div>
          )}

          <div className={mainColumnClasses}>
            <EuiTitle className="panel-title">
              <h2>
                <FormattedMessage
                  id="xpack.ml.explorer.anomalyTimelineTitle"
                  defaultMessage="Anomaly timeline"
                />
              </h2>
            </EuiTitle>

            <div
              className="ml-explorer-swimlane euiText"
              onMouseEnter={this.onSwimlaneEnterHandler}
              onMouseLeave={this.onSwimlaneLeaveHandler}
              data-test-subj="mlAnomalyExplorerSwimlaneOverall"
            >
              {showOverallSwimlane && (
                <ExplorerSwimlane
                  chartWidth={swimlaneContainerWidth}
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
                      label={i18n.translate('xpack.ml.explorer.viewByLabel', {
                        defaultMessage: 'View by',
                      })}
                    >
                      <EuiSelect
                        id="selectViewBy"
                        options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                        value={viewBySwimlaneFieldName}
                        onChange={this.viewByChangeHandler}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={i18n.translate('xpack.ml.explorer.limitLabel', {
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
                        {filterActive === true && viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL && (
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
                        chartWidth={swimlaneContainerWidth}
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

                {viewBySwimlaneDataLoading && <LoadingIndicator />}

                {!showViewBySwimlane &&
                  !viewBySwimlaneDataLoading &&
                  viewBySwimlaneFieldName !== null && (
                    <ExplorerNoInfluencersFound
                      viewBySwimlaneFieldName={viewBySwimlaneFieldName}
                      showFilterMessage={filterActive === true}
                    />
                  )}
              </>
            )}

            {annotationsData.length > 0 && (
              <>
                <EuiTitle className="panel-title">
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.explorer.annotationsTitle"
                      defaultMessage="Annotations"
                    />
                  </h2>
                </EuiTitle>
                <AnnotationsTable
                  annotations={annotationsData}
                  drillDown={true}
                  numberBadge={false}
                />
                <AnnotationFlyout />
                <EuiSpacer size="l" />
              </>
            )}

            <EuiTitle className="panel-title">
              <h2>
                <FormattedMessage
                  id="xpack.ml.explorer.anomaliesTitle"
                  defaultMessage="Anomalies"
                />
              </h2>
            </EuiTitle>

            <EuiFlexGroup
              direction="row"
              gutterSize="l"
              responsive={true}
              className="ml-anomalies-controls"
            >
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={i18n.translate('xpack.ml.explorer.severityThresholdLabel', {
                    defaultMessage: 'Severity threshold',
                  })}
                >
                  <SelectSeverity />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={i18n.translate('xpack.ml.explorer.intervalLabel', {
                    defaultMessage: 'Interval',
                  })}
                >
                  <SelectInterval />
                </EuiFormRow>
              </EuiFlexItem>
              {chartsData.seriesToPlot.length > 0 && selectedCells !== undefined && (
                <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                  <EuiFormRow label="&#8203;">
                    <CheckboxShowCharts />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <div className="euiText explorer-charts">
              {showCharts && <ExplorerChartsContainer {...{ ...chartsData, severity }} />}
            </div>

            <AnomaliesTable
              bounds={bounds}
              tableData={tableData}
              influencerFilter={this.applyFilter}
            />
          </div>
        </div>
      </ExplorerPage>
    );
  }
}
