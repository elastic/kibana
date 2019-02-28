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

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiSelect,
} from '@elastic/eui';

import { EntityControl } from './components/entity_control';
import { ForecastingModal } from './components/forecasting_modal/forecasting_modal';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { TimeseriesexplorerNoJobsFound } from './components/timeseriesexplorer_no_jobs_found';
import { TimeseriesexplorerNoResultsFound } from './components/timeseriesexplorer_no_results_found';

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
        </Fragment>
      );
    }
  }
);
