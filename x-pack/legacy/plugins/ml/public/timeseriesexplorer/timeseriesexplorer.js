/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import { isEqual } from 'lodash';

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { EntityControl } from './components/entity_control';
import { ForecastingModal } from './components/forecasting_modal/forecasting_modal';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { TimeseriesChart } from './components/timeseries_chart/timeseries_chart';
import { TimeseriesexplorerNoJobsFound } from './components/timeseriesexplorer_no_jobs_found';
import { TimeseriesexplorerNoResultsFound } from './components/timeseriesexplorer_no_results_found';

// Used to indicate the chart is being plotted across
// all partition field values, where the cardinality of the field cannot be
// obtained as it is not aggregatable e.g. 'all distinct kpi_indicator values'
const allValuesLabel = i18n.translate('xpack.ml.timeSeriesExplorer.allPartitionValuesLabel', {
  defaultMessage: 'all',
});

function getTimeseriesexplorerDefaultState() {
  return {
    loading: false,

    // Toggles display of model bounds in the focus chart
    showModelBounds: true,
  };
}

export const TimeSeriesExplorer = injectI18n(
  class TimeSeriesExplorer extends React.Component {
    static propTypes = {
      chartDetails: PropTypes.object,
      detectorIndexChanged: PropTypes.func.isRequired,
      detectorId: PropTypes.string,
      detectors: PropTypes.array.isRequired,
      entityFieldValueChanged: PropTypes.func.isRequired,
      filter: PropTypes.func.isRequired,
      hasResults: PropTypes.bool.isRequired,
      jobs: PropTypes.array.isRequired,
      loadForForecastId: PropTypes.func.isRequired,
      saveSeriesPropertiesAndRefresh: PropTypes.func.isRequired,
      showAnnotations: PropTypes.bool.isRequired,
      showAnnotationsCheckbox: PropTypes.bool.isRequired,
      showForecast: PropTypes.bool.isRequired,
      showForecastCheckbox: PropTypes.bool.isRequired,
      showModelBoundsCheckbox: PropTypes.bool.isRequired,
      selectedJob: PropTypes.object,
      tableData: PropTypes.object,
      timefilter: PropTypes.object.isRequired,
      toggleShowAnnotations: PropTypes.func.isRequired,
      toggleShowForecast: PropTypes.func.isRequired,
    };

    state = getTimeseriesexplorerDefaultState();

    detectorIndexChangeHandler = (e) => this.props.detectorIndexChanged(e.target.value);

    toggleShowModelBoundsHandler = () => {
      this.setState({
        showModelBounds: !this.state.showModelBounds,
      });
    }

    previousTsc = {};
    previousShowAnnotations = undefined;
    previousShowForecast = undefined;
    previousShowModelBounds = undefined;
    render() {
      const {
        dataNotChartable,
        chartDetails,
        detectorId,
        detectors,
        entities,
        entityFieldValueChanged,
        filter,
        hasResults,
        intl,
        jobs,
        loadForForecastId,
        saveSeriesPropertiesAndRefresh,
        showAnnotations,
        showAnnotationsCheckbox,
        showForecast,
        showForecastCheckbox,
        showModelBoundsCheckbox,
        selectedJob,
        tableData,
        timefilter,
        toggleShowAnnotations,
        toggleShowForecast,
        tsc,
      } = this.props;

      const {
        showModelBounds,
      } = this.state;

      const loading = this.props.loading || this.state.loading;

      if (jobs.length === 0) {
        return <TimeseriesexplorerNoJobsFound />;
      }

      const detectorSelectOptions = detectors.map(d => ({
        value: d.index,
        text: d.detector_description
      }));

      let renderFocusChartOnly = true;

      if (
        isEqual(this.previousTsc.focusForecastData, tsc.focusForecastData) &&
        isEqual(this.previousTsc.focusChartData, tsc.focusChartData) &&
        isEqual(this.previousTsc.focusAnnotationData, tsc.focusAnnotationData) &&
        this.previousShowAnnotations === showAnnotations &&
        this.previousShowForecast === showForecast &&
        this.previousShowModelBounds === showModelBounds
      ) {
        renderFocusChartOnly = false;
      }

      this.previousTsc = tsc;
      this.previousShowAnnotations = showAnnotations;
      this.previousShowForecast = showForecast;
      this.previousShowModelBounds = showModelBounds;

      return (
        <Fragment>
          <div className="series-controls" data-test-subj="mlSingleMetricViewerSeriesControls">
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={intl.formatMessage({
                    id: 'xpack.ml.timeSeriesExplorer.detectorLabel',
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
              {entities.map((entity) => {
                const entityKey = `${entity.fieldName}`;
                return (
                  <EntityControl
                    entity={entity}
                    entityFieldValueChanged={entityFieldValueChanged}
                    key={entityKey}
                  />
                );
              })}
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiButton
                    fill
                    iconType="refresh"
                    onClick={saveSeriesPropertiesAndRefresh}
                  >
                    <FormattedMessage
                      id="xpack.ml.timeSeriesExplorer.refreshButtonAriaLabel"
                      defaultMessage="Refresh"
                    />
                  </EuiButton>
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ textAlign: 'right' }}>
                <EuiFormRow hasEmptyLabelSpace style={{ maxWidth: '100%' }}>
                  <ForecastingModal
                    job={selectedJob}
                    detectorIndex={+detectorId}
                    entities={entities}
                    loadForForecastId={loadForForecastId}
                    className="forecast-controls"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>

          {(loading === true) && (
            <LoadingIndicator
              label={intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.loadingLabel',
                defaultMessage: 'Loading',
              })}
            />
          )}

          {(jobs.length > 0 && loading === false && hasResults === false) && (
            <TimeseriesexplorerNoResultsFound dataNotChartable={dataNotChartable} entities={entities} />
          )}

          {(jobs.length > 0 && loading === false && hasResults === true) && (
            <EuiText className="results-container">
              <span className="panel-title">
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.singleTimeSeriesAnalysisTitle"
                  defaultMessage="Single time series analysis of {functionLabel}"
                  values={{ functionLabel: chartDetails.functionLabel }}
                />
              </span>&nbsp;

              {chartDetails.entityData.count === 1 && (
                <span className="entity-count-text">
                  {chartDetails.entityData.entities.length > 0 && '('}
                  {chartDetails.entityData.entities.map((entity) => {
                    return `${entity.fieldName}: ${entity.fieldValue}`;
                  }).join(', ')}
                  {chartDetails.entityData.entities.length > 0 && ')'}
                </span>
              )}

              {chartDetails.entityData.count !== 1 && (
                <span className="entity-count-text">
                  {chartDetails.entityData.entities.map((countData, i) => {
                    const msg = '{openBrace}{cardinalityValue} distinct {fieldName} {cardinality, plural, one {} other { values}}{closeBrace}';
                    return (
                      <FormattedMessage
                        key={countData.fieldName}
                        id="xpack.ml.timeSeriesExplorer.countDataInChartDetailsDescription"
                        defaultMessage={msg}
                        values={{
                          openBrace: (i === 0) ? '(' : '',
                          closeBrace: (i === (chartDetails.entityData.entities.length - 1)) ? ')' : '',
                          cardinalityValue: countData.cardinality === 0 ? allValuesLabel : countData.cardinality,
                          cardinality: countData.cardinality,
                          fieldName: countData.fieldName
                        }}
                      />
                    );
                  })}
                </span>
              )}

              <EuiFlexGroup style={{ float: 'right' }}>
                {showModelBoundsCheckbox && (
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="toggleModelBoundsCheckbox"
                      label={intl.formatMessage({
                        id: 'xpack.ml.timeSeriesExplorer.showModelBoundsLabel',
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
                      label={intl.formatMessage({
                        id: 'xpack.ml.timeSeriesExplorer.annotationsLabel',
                        defaultMessage: 'annotations',
                      })}
                      checked={showAnnotations}
                      onChange={toggleShowAnnotations}
                    />
                  </EuiFlexItem>
                )}

                {showForecastCheckbox && (
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="toggleShowForecastCheckbox"
                      label={intl.formatMessage({
                        id: 'xpack.ml.timeSeriesExplorer.showForecastLabel',
                        defaultMessage: 'show forecast',
                      })}
                      checked={showForecast}
                      onChange={toggleShowForecast}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>

              <div className="ml-timeseries-chart" data-test-subj="mlSingleMetricViewerChart">
                <TimeseriesChart
                  {...tsc}
                  detectorIndex={detectorId}
                  renderFocusChartOnly={renderFocusChartOnly}
                  selectedJob={selectedJob}
                  showAnnotations={showAnnotations}
                  showForecast={showForecast}
                  showModelBounds={showModelBounds}
                  timefilter={timefilter}
                />
              </div>

              {showAnnotations && tsc.focusAnnotationData.length > 0 && (
                <div>
                  <span className="panel-title">
                    <FormattedMessage
                      id="xpack.ml.timeSeriesExplorer.annotationsTitle"
                      defaultMessage="Annotations"
                    />
                  </span>
                  <AnnotationsTable
                    annotations={tsc.focusAnnotationData}
                    drillDown={false}
                    numberBadge={true}
                  />
                  <EuiSpacer size="l" />
                </div>
              )}

              <AnnotationFlyout />

              <span className="panel-title">
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.anomaliesTitle"
                  defaultMessage="Anomalies"
                />
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
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              <AnomaliesTable tableData={tableData} filter={filter} timefilter={timefilter} />

            </EuiText>
          )}
        </Fragment>
      );
    }
  }
);
