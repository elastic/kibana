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
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonIcon,
  EuiSelect,
} from '@elastic/eui';

import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { TimeseriesexplorerNoJobsFound } from './components/timeseriesexplorer_no_jobs_found';
import { TimeseriesexplorerNoResultsFound } from './components/timeseriesexplorer_no_results_found';

function getTimeseriesexplorerDefaultState() {
  return {
    hasResults: false,
    loading: false,
  };
}

export const TimeSeriesExplorer = injectI18n(
  class TimeSeriesExplorer extends React.Component {
    static propTypes = {
      detectorIndexChanged: PropTypes.func.isRequired,
      detectorId: PropTypes.string,
      detectors: PropTypes.array.isRequired,
      jobs: PropTypes.array.isRequired,
    };

    state = getTimeseriesexplorerDefaultState();

    detectorIndexChangeHandler = (e) => this.props.detectorIndexChanged(e.target.value);

    render() {
      const {
        detectorId,
        detectors,
        intl,
        jobs,
      } = this.props;

      const {
        hasResults,
      } = this.state;

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
          <div className="series-controls">
            <EuiFlexGroup style={{ maxWidth: 600 }}>
              <EuiFlexItem>
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
              <EuiFlexItem>
                <div className="entity-controls">Entity Controls</div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiButtonIcon
                    aria-label={intl.formatMessage({
                      id: 'xpack.ml.timeSeriesExplorer.refreshButtonAriLabel',
                      defaultMessage: 'refresh',
                    })}
                    fill
                    iconType="play"
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

          {(jobs.length > 0 && hasResults === false) && (
            <TimeseriesexplorerNoResultsFound />
          )}
        </Fragment>
      );
    }
  }
);
