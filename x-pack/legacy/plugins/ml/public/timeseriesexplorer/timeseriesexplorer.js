/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

import { EntityControl } from './components/entity_control';
import { ForecastingModal } from './components/forecasting_modal/forecasting_modal';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
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
  };
}

export const TimeSeriesExplorer = injectI18n(
  class TimeSeriesExplorer extends React.Component {
    static propTypes = {
      detectorIndexChanged: PropTypes.func.isRequired,
      detectorId: PropTypes.string,
      detectors: PropTypes.array.isRequired,
      entityFieldValueChanged: PropTypes.func.isRequired,
      hasResults: PropTypes.bool.isRequired,
      jobs: PropTypes.array.isRequired,
      loadForForecastId: PropTypes.func.isRequired,
      saveSeriesPropertiesAndRefresh: PropTypes.func.isRequired,
      selectedJob: PropTypes.object,
    };

    state = getTimeseriesexplorerDefaultState();

    detectorIndexChangeHandler = (e) => this.props.detectorIndexChanged(e.target.value);

    render() {
      const {
        dataNotChartable,
        chartDetails,
        detectorId,
        detectors,
        entities,
        entityFieldValueChanged,
        hasResults,
        intl,
        jobs,
        loadForForecastId,
        saveSeriesPropertiesAndRefresh,
        selectedJob,
      } = this.props;

      const loading = this.props.loading || this.state.loading;

      if (jobs.length === 0) {
        return <TimeseriesexplorerNoJobsFound />;
      }

      const detectorSelectOptions = detectors.map(d => ({
        value: d.index,
        text: d.detector_description
      }));

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
            </EuiText>
          )}
        </Fragment>
      );
    }
  }
);
