/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  formatNumber,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { context } from '@kbn/kibana-react-plugin/public';
import { timeFormatter } from '@kbn/ml-date-utils';

import { FORECAST_REQUEST_STATE } from '../../../../../../../common/constants/states';
import { addItemToRecentlyAccessed } from '../../../../../util/recently_accessed';
import { forecastServiceFactory } from '../../../../../services/forecast_service';
import {
  getLatestDataOrBucketTimestamp,
  isTimeSeriesViewJob,
} from '../../../../../../../common/util/job_utils';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../../../../common/constants/locator';
import { checkPermission } from '../../../../../capabilities/check_capabilities';

const MAX_FORECASTS = 500;

const DeleteForecastConfirm = ({ onCancel, onConfirm }) => (
  <EuiConfirmModal
    title={i18n.translate(
      'xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastConfirm.title',
      {
        defaultMessage: 'Delete the selected forecast?',
      }
    )}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={i18n.translate(
      'xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastConfirm.cancelButton',
      {
        defaultMessage: 'Cancel',
      }
    )}
    confirmButtonText={i18n.translate(
      'xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastConfirm.confirmButton',
      {
        defaultMessage: 'Confirm',
      }
    )}
    defaultFocusedButton="confirm"
  >
    <p>
      <FormattedMessage
        id="xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastConfirm.text"
        defaultMessage="This will permanently delete the forecast from the job."
      />
    </p>
  </EuiConfirmModal>
);

/**
 * Table component for rendering the lists of forecasts run on an ML job.
 */
export class ForecastsTable extends Component {
  constructor(props, constructorContext) {
    super(props, constructorContext);
    this.state = {
      isLoading: props.job.data_counts.processed_record_count !== 0,
      forecasts: [],
      forecastIdToDelete: undefined,
    };
    this.mlForecastService = forecastServiceFactory(constructorContext.services.mlServices.mlApi);
  }

  /**
   * Access ML services in react context.
   */
  static contextType = context;

  componentDidMount() {
    this.loadForecasts();
    this.canDeleteJobForecast = checkPermission('canDeleteForecast');
  }

  async loadForecasts() {
    const dataCounts = this.props.job.data_counts;
    if (dataCounts.processed_record_count > 0) {
      // Get the list of all the forecasts with results at or later than the specified 'from' time.
      this.mlForecastService
        .getForecastsSummary(
          this.props.job,
          null,
          dataCounts.earliest_record_timestamp,
          MAX_FORECASTS
        )
        .then((resp) => {
          this.setState({
            isLoading: false,
            forecasts: resp.forecasts,
          });
        })
        .catch((resp) => {
          console.log('Error loading list of forecasts for jobs list:', resp);
          this.setState({
            isLoading: false,
            errorMessage: i18n.translate(
              'xpack.ml.jobsList.jobDetails.forecastsTable.loadingErrorMessage',
              {
                defaultMessage: 'Error loading the list of forecasts run on this job',
              }
            ),
            forecasts: [],
          });
        });
    }
  }

  async openSingleMetricView(forecast) {
    const {
      services: {
        chrome: { recentlyAccessed },
        application: { navigateToUrl },
        share,
      },
    } = this.context;

    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start of the job data to the end of the forecast,
    const dataCounts = this.props.job.data_counts;
    const jobEarliest = dataCounts.earliest_record_timestamp;
    const resultLatest = getLatestDataOrBucketTimestamp(
      dataCounts.latest_record_timestamp,
      dataCounts.latest_bucket_timestamp
    );
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to =
      forecast !== undefined
        ? new Date(forecast.forecast_end_timestamp).toISOString()
        : new Date(resultLatest).toISOString();

    let mlTimeSeriesExplorer = {};
    if (forecast !== undefined) {
      // Set the zoom to show duration before the forecast equal to the length of the forecast.
      const forecastDurationMs =
        forecast.forecast_end_timestamp - forecast.forecast_start_timestamp;
      const zoomFrom = Math.max(
        forecast.forecast_start_timestamp - forecastDurationMs,
        jobEarliest
      );
      mlTimeSeriesExplorer = {
        forecastId: forecast.forecast_id,
        zoom: {
          from: new Date(zoomFrom).toISOString(),
          to: new Date(forecast.forecast_end_timestamp).toISOString(),
        },
      };
    }

    const mlLocator = share.url.locators.get(ML_APP_LOCATOR);
    const singleMetricViewerForecastLink = await mlLocator.getUrl(
      {
        page: ML_PAGES.SINGLE_METRIC_VIEWER,
        pageState: {
          timeRange: {
            from,
            to,
            mode: 'absolute',
          },
          refreshInterval: {
            display: 'Off',
            pause: true,
            value: 0,
          },
          jobIds: [this.props.job.job_id],
          query: {
            query_string: {
              analyze_wildcard: true,
              query: '*',
            },
          },
          ...mlTimeSeriesExplorer,
        },
      },
      { absolute: true }
    );
    addItemToRecentlyAccessed(
      'timeseriesexplorer',
      this.props.job.job_id,
      singleMetricViewerForecastLink,
      recentlyAccessed
    );
    await navigateToUrl(singleMetricViewerForecastLink);
  }

  async deleteForecast(forecastId) {
    const {
      services: {
        mlServices: { mlApi },
      },
    } = this.context;

    this.setState({
      isLoading: true,
      forecastIdToDelete: undefined,
    });

    try {
      await mlApi.deleteForecast({ jobId: this.props.job.job_id, forecastId });
    } catch (error) {
      this.setState({
        forecastIdToDelete: undefined,
        isLoading: false,
        errorMessage: i18n.translate(
          'xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastErrorMessage',
          {
            defaultMessage: 'An error occurred when deleting the forecast.',
          }
        ),
      });
    }

    this.loadForecasts();
  }

  render() {
    if (this.state.isLoading === true) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (this.state.errorMessage !== undefined) {
      return <EuiCallOut title={this.state.errorMessage} color="danger" iconType="cross" />;
    }

    const forecasts = this.state.forecasts;

    if (forecasts.length === 0) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.jobsList.jobDetails.forecastsTable.noForecastsTitle"
              defaultMessage="No forecasts have been run for this job"
            />
          }
          iconType="iInCircle"
          role="alert"
        >
          {isTimeSeriesViewJob(this.props.job) && (
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
                  ),
                }}
              />
            </p>
          )}
        </EuiCallOut>
      );
    }

    const columns = [
      {
        field: 'forecast_create_timestamp',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.createdLabel', {
          defaultMessage: 'Created',
        }),
        dataType: 'date',
        render: timeFormatter,
        textOnly: true,
        sortable: true,
        scope: 'row',
      },
      {
        field: 'forecast_start_timestamp',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.fromLabel', {
          defaultMessage: 'From',
        }),
        dataType: 'date',
        render: timeFormatter,
        textOnly: true,
        sortable: true,
      },
      {
        field: 'forecast_end_timestamp',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.toLabel', {
          defaultMessage: 'To',
        }),
        dataType: 'date',
        render: timeFormatter,
        textOnly: true,
        sortable: true,
      },
      {
        field: 'forecast_status',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.statusLabel', {
          defaultMessage: 'Status',
        }),
        sortable: true,
      },
      {
        field: 'forecast_memory_bytes',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.memorySizeLabel', {
          defaultMessage: 'Memory size',
        }),
        render: (bytes) => formatNumber(bytes, '0b'),
        sortable: true,
      },
      {
        field: 'processing_time_ms',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.processingTimeLabel', {
          defaultMessage: 'Processing time',
        }),
        render: (ms) =>
          i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.msTimeUnitLabel', {
            defaultMessage: '{ms} ms',
            values: {
              ms,
            },
          }),
        sortable: true,
      },
      {
        field: 'forecast_expiry_timestamp',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.expiresLabel', {
          defaultMessage: 'Expires',
        }),
        render: (value) => {
          if (value === undefined) {
            return i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.neverExpiresLabel', {
              defaultMessage: 'Never expires',
            });
          }
          return timeFormatter(value);
        },
        textOnly: true,
        sortable: true,
      },
      {
        field: 'forecast_messages',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.messagesLabel', {
          defaultMessage: 'Messages',
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
        width: '75px',
        name: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.actionsLabel', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            description: i18n.translate('xpack.ml.jobsList.jobDetails.forecastsTable.viewLabel', {
              defaultMessage: 'View',
            }),
            type: 'icon',
            icon: 'eye',
            enabled: (forecast) =>
              !(
                this.props.job.blocked !== undefined ||
                forecast.forecast_status !== FORECAST_REQUEST_STATE.FINISHED
              ),
            onClick: (forecast) => this.openSingleMetricView(forecast),
            'data-test-subj': 'mlJobListForecastTabOpenSingleMetricViewButton',
          },
          ...(this.canDeleteJobForecast
            ? [
                {
                  description: i18n.translate(
                    'xpack.ml.jobsList.jobDetails.forecastsTable.deleteForecastDescription',
                    {
                      defaultMessage: 'Delete forecast',
                    }
                  ),
                  type: 'icon',
                  icon: 'trash',
                  color: 'danger',
                  enabled: () => this.state.isLoading === false,
                  onClick: (item) => {
                    this.setState({
                      forecastIdToDelete: item.forecast_id,
                    });
                  },
                  'data-test-subj': 'mlJobListForecastTabDeleteForecastButton',
                },
              ]
            : []),
        ],
      },
    ];

    return (
      <>
        <EuiInMemoryTable
          data-test-subj="mlJobListForecastTable"
          compressed={true}
          items={forecasts}
          columns={columns}
          pagination={{
            pageSizeOptions: [5, 10, 25],
          }}
          sorting={true}
        />
        {this.state.forecastIdToDelete !== undefined ? (
          <DeleteForecastConfirm
            onCancel={() =>
              this.setState({
                forecastIdToDelete: undefined,
              })
            }
            onConfirm={() => this.deleteForecast(this.state.forecastIdToDelete)}
          />
        ) : null}
      </>
    );
  }
}
ForecastsTable.propTypes = {
  job: PropTypes.object.isRequired,
};
