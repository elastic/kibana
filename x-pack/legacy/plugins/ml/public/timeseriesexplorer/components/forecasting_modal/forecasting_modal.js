/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React modal dialog which allows the user to run and view time series forecasts.
 */

import PropTypes from 'prop-types';
import _ from 'lodash';

import React, { Component } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { timefilter } from 'ui/timefilter';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { FORECAST_REQUEST_STATE, JOB_STATE } from '../../../../common/constants/states';
import { MESSAGE_LEVEL } from '../../../../common/constants/message_levels';
import { isJobVersionGte } from '../../../../common/util/job_utils';
import { parseInterval } from '../../../../common/util/parse_interval';
import { Modal } from './modal';
import { PROGRESS_STATES } from './progress_states';
import { ml } from 'plugins/ml/services/ml_api_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlForecastService } from 'plugins/ml/services/forecast_service';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const FORECAST_DURATION_MAX_DAYS = 3650; // Max forecast duration allowed by analytics.

const FORECAST_JOB_MIN_VERSION = '6.1.0'; // Forecasting only allowed for jobs created >= 6.1.0.
const FORECASTS_VIEW_MAX = 5; // Display links to a maximum of 5 forecasts.
const FORECAST_DURATION_MAX_MS = FORECAST_DURATION_MAX_DAYS * 86400000;
const WARN_NUM_PARTITIONS = 100; // Warn about running a forecast with this number of field values.
const FORECAST_STATS_POLL_FREQUENCY = 250; // Frequency in ms at which to poll for forecast request stats.
const WARN_NO_PROGRESS_MS = 120000; // If no progress in forecast request, abort check and warn.

function getDefaultState() {
  return {
    isModalVisible: false,
    previousForecasts: [],
    isForecastRequested: false,
    forecastProgress: PROGRESS_STATES.UNSET,
    jobOpeningState: PROGRESS_STATES.UNSET,
    jobClosingState: PROGRESS_STATES.UNSET,
    newForecastDuration: '1d',
    isNewForecastDurationValid: true,
    newForecastDurationErrors: [],
    messages: [],
  };
}

export const ForecastingModal = injectI18n(
  class ForecastingModal extends Component {
    static propTypes = {
      isDisabled: PropTypes.bool,
      job: PropTypes.object,
      detectorIndex: PropTypes.number,
      entities: PropTypes.array,
      loadForForecastId: PropTypes.func,
    };

    constructor(props) {
      super(props);
      this.state = getDefaultState();

      // Used to poll for updates on a running forecast.
      this.forecastChecker = null;
    }

    addMessage = (message, status, clearFirst = false) => {
      const msg = { message, status };

      this.setState(prevState => ({
        messages: clearFirst ? [msg] : [...prevState.messages, msg],
      }));
    };

    viewForecast = forecastId => {
      this.props.loadForForecastId(forecastId);
      this.closeModal();
    };

    onNewForecastDurationChange = event => {
      const { intl } = this.props;
      const newForecastDurationErrors = [];
      let isNewForecastDurationValid = true;
      const duration = parseInterval(event.target.value);
      if (duration === null) {
        isNewForecastDurationValid = false;
        newForecastDurationErrors.push(
          intl.formatMessage({
            id: 'xpack.ml.timeSeriesExplorer.forecastingModal.invalidDurationFormatErrorMessage',
            defaultMessage: 'Invalid duration format',
          })
        );
      } else if (duration.asMilliseconds() > FORECAST_DURATION_MAX_MS) {
        isNewForecastDurationValid = false;
        newForecastDurationErrors.push(
          intl.formatMessage(
            {
              id:
                'xpack.ml.timeSeriesExplorer.forecastingModal.forecastDurationMustNotBeGreaterThanMaximumErrorMessage',
              defaultMessage:
                'Forecast duration must not be greater than {maximumForecastDurationDays} days',
            },
            { maximumForecastDurationDays: FORECAST_DURATION_MAX_DAYS }
          )
        );
      } else if (duration.asMilliseconds() === 0) {
        isNewForecastDurationValid = false;
        newForecastDurationErrors.push(
          intl.formatMessage({
            id:
              'xpack.ml.timeSeriesExplorer.forecastingModal.forecastDurationMustNotBeZeroErrorMessage',
            defaultMessage: 'Forecast duration must not be zero',
          })
        );
      }

      this.setState({
        newForecastDuration: event.target.value,
        isNewForecastDurationValid,
        newForecastDurationErrors,
      });
    };

    checkJobStateAndRunForecast = () => {
      this.setState({
        isForecastRequested: true,
        messages: [],
      });

      // A forecast can only be run on an opened job,
      // so open job if it is closed.
      if (this.props.job.state === JOB_STATE.CLOSED) {
        this.openJobAndRunForecast();
      } else {
        this.runForecast(false);
      }
    };

    openJobAndRunForecast = () => {
      // Opens a job in a 'closed' state prior to running a forecast.
      this.setState({
        jobOpeningState: PROGRESS_STATES.WAITING,
      });

      mlJobService
        .openJob(this.props.job.job_id)
        .then(() => {
          // If open was successful run the forecast, then close the job again.
          this.setState({
            jobOpeningState: PROGRESS_STATES.DONE,
          });
          this.runForecast(true);
        })
        .catch(resp => {
          console.log('Time series forecast modal - could not open job:', resp);
          this.addMessage(
            this.props.intl.formatMessage({
              id:
                'xpack.ml.timeSeriesExplorer.forecastingModal.errorWithOpeningJobBeforeRunningForecastErrorMessage',
              defaultMessage: 'Error opening job before running forecast',
            }),
            MESSAGE_LEVEL.ERROR
          );
          this.setState({
            jobOpeningState: PROGRESS_STATES.ERROR,
          });
        });
    };

    runForecastErrorHandler = (resp, closeJob) => {
      const intl = this.props.intl;

      this.setState({ forecastProgress: PROGRESS_STATES.ERROR });
      console.log('Time series forecast modal - error running forecast:', resp);
      if (resp && resp.message) {
        this.addMessage(resp.message, MESSAGE_LEVEL.ERROR, true);
      } else {
        this.addMessage(
          intl.formatMessage({
            id:
              'xpack.ml.timeSeriesExplorer.forecastingModal.unexpectedResponseFromRunningForecastErrorMessage',
            defaultMessage:
              'Unexpected response from running forecast. The request may have failed.',
          }),
          MESSAGE_LEVEL.ERROR,
          true
        );
      }

      if (closeJob === true) {
        this.setState({ jobClosingState: PROGRESS_STATES.WAITING });
        mlJobService
          .closeJob(this.props.job.job_id)
          .then(() => {
            this.setState({ jobClosingState: PROGRESS_STATES.DONE });
          })
          .catch(response => {
            console.log('Time series forecast modal - could not close job:', response);
            this.addMessage(
              intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.forecastingModal.errorWithClosingJobErrorMessage',
                defaultMessage: 'Error closing job',
              }),
              MESSAGE_LEVEL.ERROR
            );
            this.setState({ jobClosingState: PROGRESS_STATES.ERROR });
          });
      }
    };

    runForecast = closeJobAfterRunning => {
      this.setState({
        forecastProgress: 0,
      });

      // Always supply the duration to the endpoint in seconds as some of the moment duration
      // formats accepted by Kibana (w, M, y) are not valid formats in Elasticsearch.
      const durationInSeconds = parseInterval(this.state.newForecastDuration).asSeconds();

      mlForecastService
        .runForecast(this.props.job.job_id, `${durationInSeconds}s`)
        .then(resp => {
          // Endpoint will return { acknowledged:true, id: <now timestamp> } before forecast is complete.
          // So wait for results and then refresh the dashboard to the end of the forecast.
          if (resp.forecast_id !== undefined) {
            this.waitForForecastResults(resp.forecast_id, closeJobAfterRunning);
          } else {
            this.runForecastErrorHandler(resp, closeJobAfterRunning);
          }
        })
        .catch(resp => this.runForecastErrorHandler(resp, closeJobAfterRunning));
    };

    waitForForecastResults = (forecastId, closeJobAfterRunning) => {
      // Obtain the stats for the forecast request and check forecast is progressing.
      // When the stats show the forecast is finished, load the
      // forecast results into the view.
      const { intl } = this.props;
      let previousProgress = 0;
      let noProgressMs = 0;
      this.forecastChecker = setInterval(() => {
        mlForecastService
          .getForecastRequestStats(this.props.job, forecastId)
          .then(resp => {
            // Get the progress (stats value is between 0 and 1).
            const progress = _.get(resp, ['stats', 'forecast_progress'], previousProgress);
            const status = _.get(resp, ['stats', 'forecast_status']);

            // The requests for forecast stats can get routed to different shards,
            // and if these operate at different speeds there is a chance that a
            // previous request could arrive later.
            // The progress reported by the back-end should never go down, so
            // to be on the safe side, only update state if progress has increased.
            if (progress > previousProgress) {
              this.setState({ forecastProgress: Math.round(100 * progress) });
            }

            // Display any messages returned in the request stats.
            let messages = _.get(resp, ['stats', 'forecast_messages'], []);
            messages = messages.map(message => ({ message, status: MESSAGE_LEVEL.WARNING }));
            this.setState({ messages });

            if (status === FORECAST_REQUEST_STATE.FINISHED) {
              clearInterval(this.forecastChecker);

              if (closeJobAfterRunning === true) {
                this.setState({ jobClosingState: PROGRESS_STATES.WAITING });
                mlJobService
                  .closeJob(this.props.job.job_id)
                  .then(() => {
                    this.setState({
                      jobClosingState: PROGRESS_STATES.DONE,
                    });
                    this.props.loadForForecastId(forecastId);
                    this.closeAfterRunningForecast();
                  })
                  .catch(response => {
                    // Load the forecast data in the main page,
                    // but leave this dialog open so the error can be viewed.
                    console.log('Time series forecast modal - could not close job:', response);
                    this.addMessage(
                      intl.formatMessage({
                        id:
                          'xpack.ml.timeSeriesExplorer.forecastingModal.errorWithClosingJobAfterRunningForecastErrorMessage',
                        defaultMessage: 'Error closing job after running forecast',
                      }),
                      MESSAGE_LEVEL.ERROR
                    );
                    this.setState({
                      jobClosingState: PROGRESS_STATES.ERROR,
                    });
                    this.props.loadForForecastId(forecastId);
                  });
              } else {
                this.props.loadForForecastId(forecastId);
                this.closeAfterRunningForecast();
              }
            } else {
              // Display a warning and abort check if the forecast hasn't
              // progressed for WARN_NO_PROGRESS_MS.
              if (progress === previousProgress) {
                noProgressMs += FORECAST_STATS_POLL_FREQUENCY;
                if (noProgressMs > WARN_NO_PROGRESS_MS) {
                  console.log(
                    `Forecast request has not progressed for ${WARN_NO_PROGRESS_MS}ms. Cancelling check.`
                  );
                  this.addMessage(
                    intl.formatMessage(
                      {
                        id:
                          'xpack.ml.timeSeriesExplorer.forecastingModal.noProgressReportedForNewForecastErrorMessage',
                        defaultMessage:
                          'No progress reported for the new forecast for {WarnNoProgressMs}ms.' +
                          'An error may have occurred whilst running the forecast.',
                      },
                      { WarnNoProgressMs: WARN_NO_PROGRESS_MS }
                    ),
                    MESSAGE_LEVEL.ERROR
                  );

                  // Try and load any results which may have been created.
                  this.props.loadForForecastId(forecastId);
                  this.setState({ forecastProgress: PROGRESS_STATES.ERROR });
                  clearInterval(this.forecastChecker);
                }
              } else {
                if (progress > previousProgress) {
                  previousProgress = progress;
                }

                // Reset the 'no progress' check value.
                noProgressMs = 0;
              }
            }
          })
          .catch(resp => {
            console.log(
              'Time series forecast modal - error loading stats of forecast from elasticsearch:',
              resp
            );
            this.addMessage(
              intl.formatMessage({
                id:
                  'xpack.ml.timeSeriesExplorer.forecastingModal.errorWithLoadingStatsOfRunningForecastErrorMessage',
                defaultMessage: 'Error loading stats of running forecast.',
              }),
              MESSAGE_LEVEL.ERROR
            );
            this.setState({
              forecastProgress: PROGRESS_STATES.ERROR,
            });
            clearInterval(this.forecastChecker);
          });
      }, FORECAST_STATS_POLL_FREQUENCY);
    };

    openModal = () => {
      const { intl } = this.props;
      const job = this.props.job;

      if (typeof job === 'object') {
        // Get the list of all the finished forecasts for this job with results at or later than the dashboard 'from' time.
        const bounds = timefilter.getActiveBounds();
        const statusFinishedQuery = {
          term: {
            forecast_status: FORECAST_REQUEST_STATE.FINISHED,
          },
        };
        mlForecastService
          .getForecastsSummary(job, statusFinishedQuery, bounds.min.valueOf(), FORECASTS_VIEW_MAX)
          .then(resp => {
            this.setState({
              previousForecasts: resp.forecasts,
            });
          })
          .catch(resp => {
            console.log('Time series forecast modal - error obtaining forecasts summary:', resp);
            this.addMessage(
              intl.formatMessage({
                id:
                  'xpack.ml.timeSeriesExplorer.forecastingModal.errorWithObtainingListOfPreviousForecastsErrorMessage',
                defaultMessage: 'Error obtaining list of previous forecasts',
              }),
              MESSAGE_LEVEL.ERROR
            );
          });

        // Display a warning about running a forecast if there is high number
        // of partitioning fields.
        const entityFieldNames = this.props.entities.map(entity => entity.fieldName);
        if (entityFieldNames.length > 0) {
          ml.getCardinalityOfFields({
            index: job.datafeed_config.indices,
            fieldNames: entityFieldNames,
            query: job.datafeed_config.query,
            timeFieldName: job.data_description.time_field,
            earliestMs: job.data_counts.earliest_record_timestamp,
            latestMs: job.data_counts.latest_record_timestamp,
          })
            .then(results => {
              let numPartitions = 1;
              Object.values(results).forEach(cardinality => {
                numPartitions = numPartitions * cardinality;
              });
              if (numPartitions > WARN_NUM_PARTITIONS) {
                this.addMessage(
                  intl.formatMessage(
                    {
                      id:
                        'xpack.ml.timeSeriesExplorer.forecastingModal.dataContainsMorePartitionsMessage',
                      defaultMessage:
                        'Note that this data contains more than {warnNumPartitions} ' +
                        'partitions so running a forecast may take a long time and consume a high amount of resource',
                    },
                    { warnNumPartitions: WARN_NUM_PARTITIONS }
                  ),
                  MESSAGE_LEVEL.WARNING
                );
              }
            })
            .catch(resp => {
              console.log(
                'Time series forecast modal - error obtaining cardinality of fields:',
                resp
              );
            });
        }

        this.setState({ isModalVisible: true });
      }
    };

    closeAfterRunningForecast = () => {
      // Only close the dialog automatically after a forecast has run
      // if the message bar is clear. Otherwise the user may not catch
      // any messages returned in the forecast request stats.
      if (this.state.messages.length === 0) {
        // Wrap the close in a timeout to give the user a chance to see progress update.
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      }
    };

    closeModal = () => {
      if (this.forecastChecker !== null) {
        clearInterval(this.forecastChecker);
      }
      this.setState(getDefaultState());
    };

    render() {
      // Forecasting disabled if detector has an over field or job created < 6.1.0.
      let isForecastingDisabled = false;
      let forecastingDisabledMessage = null;
      const { intl, job } = this.props;
      if (job !== undefined) {
        const detector = job.analysis_config.detectors[this.props.detectorIndex];
        const overFieldName = detector.over_field_name;
        if (overFieldName !== undefined) {
          isForecastingDisabled = true;
          forecastingDisabledMessage = intl.formatMessage({
            id:
              'xpack.ml.timeSeriesExplorer.forecastingModal.forecastingNotAvailableForPopulationDetectorsMessage',
            defaultMessage:
              'Forecasting is not available for population detectors with an over field',
          });
        } else if (isJobVersionGte(job, FORECAST_JOB_MIN_VERSION) === false) {
          isForecastingDisabled = true;
          forecastingDisabledMessage = intl.formatMessage(
            {
              id:
                'xpack.ml.timeSeriesExplorer.forecastingModal.forecastingOnlyAvailableForJobsCreatedInSpecifiedVersionMessage',
              defaultMessage:
                'Forecasting is only available for jobs created in version {minVersion} or later',
            },
            { minVersion: FORECAST_JOB_MIN_VERSION }
          );
        }
      }

      const forecastButton = (
        <EuiButton
          onClick={this.openModal}
          isDisabled={isForecastingDisabled}
          fill
          data-test-subj="mlSingleMetricViewerButtonForecast"
        >
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.forecastingModal.forecastButtonLabel"
            defaultMessage="Forecast"
          />
        </EuiButton>
      );

      return (
        <div>
          {isForecastingDisabled ? (
            <EuiToolTip position="left" content={forecastingDisabledMessage}>
              {forecastButton}
            </EuiToolTip>
          ) : (
            forecastButton
          )}

          {this.state.isModalVisible && (
            <Modal
              job={this.props.job}
              forecasts={this.state.previousForecasts}
              close={this.closeModal}
              viewForecast={this.viewForecast}
              runForecast={this.checkJobStateAndRunForecast}
              newForecastDuration={this.state.newForecastDuration}
              onNewForecastDurationChange={this.onNewForecastDurationChange}
              isNewForecastDurationValid={this.state.isNewForecastDurationValid}
              newForecastDurationErrors={this.state.newForecastDurationErrors}
              isForecastRequested={this.state.isForecastRequested}
              forecastProgress={this.state.forecastProgress}
              jobOpeningState={this.state.jobOpeningState}
              jobClosingState={this.state.jobClosingState}
              messages={this.state.messages}
            />
          )}
        </div>
      );
    }
  }
);
