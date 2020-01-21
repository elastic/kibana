/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiCheckbox, EuiFieldText, EuiCallOut } from '@elastic/eui';

import { has } from 'lodash';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { parseInterval } from '../../../../../../common/util/parse_interval';
import { ml } from '../../../../services/ml_api_service';
import { SelectSeverity } from './select_severity';
import { mlCreateWatchService } from './create_watch_service';
const STATUS = mlCreateWatchService.STATUS;

export const CreateWatch = injectI18n(
  class CreateWatch extends Component {
    static propTypes = {
      jobId: PropTypes.string.isRequired,
      bucketSpan: PropTypes.string.isRequired,
    };

    constructor(props) {
      super(props);
      mlCreateWatchService.reset();
      this.config = mlCreateWatchService.config;

      this.state = {
        jobId: this.props.jobId,
        bucketSpan: this.props.bucketSpan,
        interval: this.config.interval,
        threshold: this.config.threshold,
        includeEmail: this.config.emailIncluded,
        email: this.config.email,
        emailEnabled: false,
        status: null,
        watchAlreadyExists: false,
      };
    }

    componentDidMount() {
      // make the interval 2 times the bucket span
      if (this.state.bucketSpan) {
        const intervalObject = parseInterval(this.state.bucketSpan);
        let bs = intervalObject.asMinutes() * 2;
        if (bs < 1) {
          bs = 1;
        }

        const interval = `${bs}m`;
        this.setState({ interval }, () => {
          this.config.interval = interval;
        });
      }

      // load elasticsearch settings to see if email has been configured
      ml.getNotificationSettings().then(resp => {
        if (has(resp, 'defaults.xpack.notification.email')) {
          this.setState({ emailEnabled: true });
        }
      });

      mlCreateWatchService
        .loadWatch(this.state.jobId)
        .then(() => {
          this.setState({ watchAlreadyExists: true });
        })
        .catch(() => {
          this.setState({ watchAlreadyExists: false });
        });
    }

    onThresholdChange = threshold => {
      this.setState({ threshold }, () => {
        this.config.threshold = threshold;
      });
    };

    onIntervalChange = e => {
      const interval = e.target.value;
      this.setState({ interval }, () => {
        this.config.interval = interval;
      });
    };

    onIncludeEmailChanged = e => {
      const includeEmail = e.target.checked;
      this.setState({ includeEmail }, () => {
        this.config.includeEmail = includeEmail;
      });
    };

    onEmailChange = e => {
      const email = e.target.value;
      this.setState({ email }, () => {
        this.config.email = email;
      });
    };

    render() {
      const { intl } = this.props;
      const { status } = this.state;

      if (status === null || status === STATUS.SAVING || status === STATUS.SAVE_FAILED) {
        return (
          <div className="create-watch">
            <div className="form-group form-group-flex">
              <div className="sub-form-group">
                <div>
                  <label htmlFor="selectInterval" className="euiFormLabel">
                    <FormattedMessage
                      id="xpack.ml.newJob.simple.createWatchView.timeRangeLabel"
                      defaultMessage="Time range"
                    />
                  </label>
                </div>
                <FormattedMessage
                  id="xpack.ml.newJob.simple.createWatchView.nowLabel"
                  defaultMessage="Now - {selectInterval}"
                  values={{
                    selectInterval: (
                      <EuiFieldText
                        id="selectInterval"
                        value={this.state.interval}
                        onChange={this.onIntervalChange}
                      />
                    ),
                  }}
                />
              </div>

              <div className="sub-form-group">
                <div>
                  <label htmlFor="selectSeverity" className="euiFormLabel">
                    <FormattedMessage
                      id="xpack.ml.newJob.simple.createWatchView.severityThresholdLabel"
                      defaultMessage="Severity threshold"
                    />
                  </label>
                </div>
                <div className="dropdown-group">
                  <SelectSeverity onChange={this.onThresholdChange} />
                </div>
              </div>
            </div>
            {this.state.emailEnabled && (
              <div className="form-group">
                <EuiCheckbox
                  id="includeEmail"
                  label={
                    <FormattedMessage
                      id="xpack.ml.newJob.simple.createWatchView.sendEmailLabel"
                      defaultMessage="Send email"
                    />
                  }
                  checked={this.state.includeEmail}
                  onChange={this.onIncludeEmailChanged}
                />
                {this.state.includeEmail && (
                  <div className="email-section">
                    <EuiFieldText
                      value={this.state.email}
                      onChange={this.onEmailChange}
                      placeholder={intl.formatMessage({
                        id: 'xpack.ml.newJob.simple.createWatchView.emailAddressPlaceholder',
                        defaultMessage: 'email address',
                      })}
                      aria-label={intl.formatMessage({
                        id: 'xpack.ml.newJob.simple.createWatchView.watchEmailAddressAriaLabel',
                        defaultMessage: 'Watch email address',
                      })}
                    />
                  </div>
                )}
              </div>
            )}
            {this.state.watchAlreadyExists && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ml.newJob.simple.createWatchView.watchAlreadyExistsWarningMessage"
                    defaultMessage="Warning, watch ml-{jobId} already exists, clicking apply will overwrite the original."
                    values={{
                      jobId: this.state.jobId,
                    }}
                  />
                }
              />
            )}
          </div>
        );
      } else if (status === STATUS.SAVED) {
        return (
          <div>
            <FormattedMessage
              id="xpack.ml.newJob.simple.createWatchView.successLabel"
              defaultMessage="Success"
            />
          </div>
        );
      } else {
        return <div />;
      }
    }
  }
);
