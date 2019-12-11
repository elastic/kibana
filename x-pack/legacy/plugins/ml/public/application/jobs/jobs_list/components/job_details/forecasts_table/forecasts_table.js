/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import rison from 'rison-node';

import React, {
  Component
} from 'react';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner
} from '@elastic/eui';
import { formatDate, formatNumber } from '@elastic/eui/lib/services/format';

import { FORECAST_REQUEST_STATE } from '../../../../../../../common/constants/states';
import { addItemToRecentlyAccessed } from '../../../../../util/recently_accessed';
import { mlForecastService } from '../../../../../services/forecast_service';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getLatestDataOrBucketTimestamp, isTimeSeriesViewJob } from '../../../../../../../common/util/job_utils';

const MAX_FORECASTS = 500;
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Table component for rendering the lists of forecasts run on an ML job.
 */
class ForecastsTableUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: props.job.data_counts.processed_record_count !== 0,
      forecasts: []
    };
  }

  componentDidMount() {
    const dataCounts = this.props.job.data_counts;
    if (dataCounts.processed_record_count > 0) {
      // Get the list of all the forecasts with results at or later than the specified 'from' time.
      mlForecastService.getForecastsSummary(
        this.props.job,
        null,
        dataCounts.earliest_record_timestamp,
        MAX_FORECASTS)
        .then((resp) => {
          this.setState({
            isLoading: false,
            forecasts: resp.forecasts
          });
        })
        .catch((resp) => {
          console.log('Error loading list of forecasts for jobs list:', resp);
          this.setState({
            isLoading: false,
            errorMessage: this.props.intl.formatMessage({
              id: 'xpack.ml.jobsList.jobDetails.forecastsTable.loadingErrorMessage',
              defaultMessage: 'Error loading the list of forecasts run on this job'
            }),
            forecasts: []
          });
        });
    }
  }

  openSingleMetricView(forecast) {
    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start of the job data to the end of the forecast,
    const dataCounts = this.props.job.data_counts;
    const jobEarliest = dataCounts.earliest_record_timestamp;
    const resultLatest = getLatestDataOrBucketTimestamp(dataCounts.latest_record_timestamp, dataCounts.latest_bucket_timestamp);
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to = forecast !== undefined ? new Date(forecast.forecast_end_timestamp).toISOString() :
      new Date(resultLatest).toISOString();

    const _g = rison.encode({
      ml: {
        jobIds: [this.props.job.job_id]
      },
      refreshInterval: {
        display: 'Off',
        pause: false,
        value: 0
      },
      time: {
        from,
        to,
        mode: 'absolute'
      }
    });

    const appState = {
      query: {
        query_string: {
          analyze_wildcard: true,
          query: '*'
        }
      }
    };

    if (forecast !== undefined) {
      // Set the zoom to show duration before the forecast equal to the length of the forecast.
      const forecastDurationMs = forecast.forecast_end_timestamp - forecast.forecast_start_timestamp;
      const zoomFrom = Math.max(forecast.forecast_start_timestamp - forecastDurationMs, jobEarliest);

      appState.mlTimeSeriesExplorer = {
        forecastId: forecast.forecast_id,
        zoom: {
          from: new Date(zoomFrom).toISOString(),
          to: new Date(forecast.forecast_end_timestamp).toISOString()
        }
      };
    }

    const _a = rison.encode(appState);

    const url = `?_g=${_g}&_a=${_a}`;
    addItemToRecentlyAccessed('timeseriesexplorer', this.props.job.job_id, url);
    window.open(`#/timeseriesexplorer${url}`, '_self');
  }

  render() {
    if (this.state.isLoading === true) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}><EuiLoadingSpinner size="l"/></EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (this.state.errorMessage !== undefined) {
      return (
        <EuiCallOut
          title={this.state.errorMessage}
          color="danger"
          iconType="cross"
        />
      );
    }

    const forecasts = this.state.forecasts;

    if (forecasts.length === 0) {
      return (
        <EuiCallOut
          title={(<FormattedMessage
            id="xpack.ml.jobsList.jobDetails.forecastsTable.noForecastsTitle"
            defaultMessage="No forecasts have been run for this job"
          />)}
          iconType="iInCircle"
          role="alert"
        >
          {isTimeSeriesViewJob(this.props.job) &&
            <p>
              <FormattedMessage
                id="xpack.ml.jobsList.jobDetails.forecastsTable.noForecastsDescription"
                defaultMessage="To run a forecast, open the {singleMetricViewerLink}"
                values={{
                  singleMetricViewerLink: (
                    <EuiLink onClick={() => this.openSingleMetricView()}>
                      <FormattedMessage
                        id="xpack.ml.jobsList.jobDetails.forecastsTable.noForecastsDescription.linkText"
                        defaultMessage="Single Metric Viewer"
                      />
                    </EuiLink>
                  )
                }}
              />
            </p>
          }
        </EuiCallOut>
      );
    }

    const { intl } = this.props;

    const columns = [
      {
        field: 'forecast_create_timestamp',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.createdLabel',
          defaultMessage: 'Created'
        }),
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        textOnly: true,
        sortable: true
      },
      {
        field: 'forecast_start_timestamp',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.fromLabel',
          defaultMessage: 'From'
        }),
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        textOnly: true,
        sortable: true
      },
      {
        field: 'forecast_end_timestamp',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.toLabel',
          defaultMessage: 'To'
        }),
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        textOnly: true,
        sortable: true
      },
      {
        field: 'forecast_status',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.statusLabel',
          defaultMessage: 'Status'
        }),
        sortable: true
      },
      {
        field: 'forecast_memory_bytes',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.memorySizeLabel',
          defaultMessage: 'Memory size'
        }),
        render: (bytes) => formatNumber(bytes, '0b'),
        sortable: true
      },
      {
        field: 'processing_time_ms',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.processingTimeLabel',
          defaultMessage: 'Processing time'
        }),
        render: (ms) => intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.msTimeUnitLabel',
          defaultMessage: '{ms} ms' }, {
          ms
        }),
        sortable: true
      },
      {
        field: 'forecast_expiry_timestamp',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.expiresLabel',
          defaultMessage: 'Expires'
        }),
        render: (date) => formatDate(date, TIME_FORMAT),
        textOnly: true,
        sortable: true
      },
      {
        field: 'forecast_messages',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.messagesLabel',
          defaultMessage: 'Messages'
        }),
        sortable: false,
        render: (messages) => {
          return (
            <div>
              {messages.map((message, index) => {
                return <p key={index}>{message}</p>;
              })}
            </div>
          );
        },
        textOnly: true,
      },
      {
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobDetails.forecastsTable.viewLabel',
          defaultMessage: 'View'
        }),
        width: '60px',
        render: (forecast) => {
          const viewForecastAriaLabel = intl.formatMessage({
            id: 'xpack.ml.jobsList.jobDetails.forecastsTable.viewAriaLabel',
            defaultMessage: 'View forecast created at {createdDate}' }, {
            createdDate: formatDate(forecast.forecast_create_timestamp, TIME_FORMAT)
          });

          return (
            <EuiButtonIcon
              onClick={() => this.openSingleMetricView(forecast)}
              isDisabled={forecast.forecast_status !== FORECAST_REQUEST_STATE.FINISHED}
              iconType="stats"
              aria-label={viewForecastAriaLabel}
            />
          );
        }
      }
    ];

    return (
      <EuiInMemoryTable
        compressed={true}
        items={forecasts}
        columns={columns}
        pagination={{
          pageSizeOptions: [5, 10, 25]
        }}
        sorting={true}
      />
    );
  }
}
ForecastsTableUI.propTypes = {
  job: PropTypes.object.isRequired,
};

const ForecastsTable = injectI18n(ForecastsTableUI);

export { ForecastsTable };
