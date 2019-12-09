/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiRadio,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { padLeft, range } from 'lodash';
import moment from 'moment-timezone';
import React, { Component } from 'react';
import styled from 'styled-components';
import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';
import { KibanaCoreContext } from '../../../../../../observability/public';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { KibanaLink } from '../../../shared/Links/KibanaLink';
import { createErrorGroupWatch, Schedule } from './createErrorGroupWatch';
import { ElasticDocsLink } from '../../../shared/Links/ElasticDocsLink';
import { PluginsContext } from '../../../../new-platform/plugin';

type ScheduleKey = keyof Schedule;

const SmallInput = styled.div`
  .euiFormRow {
    max-width: 85px;
  }
  .euiFormHelpText {
    width: 200px;
  }
`;

interface WatcherFlyoutProps {
  urlParams: IUrlParams;
  onClose: () => void;
  isOpen: boolean;
}

type IntervalUnit = 'm' | 'h';

interface WatcherFlyoutState {
  schedule: ScheduleKey;
  threshold: number;
  actions: {
    slack: boolean;
    email: boolean;
  };
  interval: {
    value: number;
    unit: IntervalUnit;
  };
  daily: string;
  emails: string;
  slackUrl: string;
}

export class WatcherFlyout extends Component<
  WatcherFlyoutProps,
  WatcherFlyoutState
> {
  static contextType = KibanaCoreContext;
  context!: React.ContextType<typeof KibanaCoreContext>;
  public state: WatcherFlyoutState = {
    schedule: 'daily',
    threshold: 10,
    actions: {
      slack: false,
      email: false
    },
    interval: {
      value: 10,
      unit: 'm'
    },
    daily: '08:00',
    emails: '',
    slackUrl: ''
  };

  public onChangeSchedule = (schedule: ScheduleKey) => {
    this.setState({ schedule });
  };

  public onChangeThreshold = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      threshold: parseInt(event.target.value, 10)
    });
  };

  public onChangeDailyUnit = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      daily: event.target.value
    });
  };

  public onChangeIntervalValue = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    this.setState({
      interval: {
        value: parseInt(event.target.value, 10),
        unit: this.state.interval.unit
      }
    });
  };

  public onChangeIntervalUnit = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    this.setState({
      interval: {
        value: this.state.interval.value,
        unit: event.target.value as IntervalUnit
      }
    });
  };

  public onChangeAction = (actionName: 'slack' | 'email') => {
    this.setState({
      actions: {
        ...this.state.actions,
        [actionName]: !this.state.actions[actionName]
      }
    });
  };

  public onChangeEmails = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ emails: event.target.value });
  };

  public onChangeSlackUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ slackUrl: event.target.value });
  };

  public createWatch = ({
    indexPatternTitle
  }: {
    indexPatternTitle: string;
  }) => () => {
    const { serviceName } = this.props.urlParams;
    const core = this.context;

    if (!serviceName) {
      return;
    }

    const emails = this.state.actions.email
      ? this.state.emails
          .split(',')
          .map(email => email.trim())
          .filter(email => !!email)
      : [];

    const slackUrl = this.state.actions.slack ? this.state.slackUrl : '';

    const schedule =
      this.state.schedule === 'interval'
        ? {
            interval: `${this.state.interval.value}${this.state.interval.unit}`
          }
        : {
            daily: { at: `${this.state.daily}` }
          };

    const timeRange =
      this.state.schedule === 'interval'
        ? {
            value: this.state.interval.value,
            unit: this.state.interval.unit
          }
        : {
            value: 24,
            unit: 'h'
          };

    return createErrorGroupWatch({
      http: core.http,
      emails,
      schedule,
      serviceName,
      slackUrl,
      threshold: this.state.threshold,
      timeRange,
      apmIndexPatternTitle: indexPatternTitle
    })
      .then((id: string) => {
        this.props.onClose();
        this.addSuccessToast(id);
      })
      .catch(e => {
        // eslint-disable-next-line
        console.error(e);
        this.addErrorToast();
      });
  };

  public addErrorToast = () => {
    const core = this.context;

    core.notifications.toasts.addWarning({
      title: i18n.translate(
        'xpack.apm.serviceDetails.enableErrorReportsPanel.watchCreationFailedNotificationTitle',
        {
          defaultMessage: 'Watch creation failed'
        }
      ),
      text: toMountPoint(
        <p>
          {i18n.translate(
            'xpack.apm.serviceDetails.enableErrorReportsPanel.watchCreationFailedNotificationText',
            {
              defaultMessage:
                'Make sure your user has permission to create watches.'
            }
          )}
        </p>
      )
    });
  };

  public addSuccessToast = (id: string) => {
    const core = this.context;

    core.notifications.toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.serviceDetails.enableErrorReportsPanel.watchCreatedNotificationTitle',
        {
          defaultMessage: 'New watch created!'
        }
      ),
      text: toMountPoint(
        <p>
          {i18n.translate(
            'xpack.apm.serviceDetails.enableErrorReportsPanel.watchCreatedNotificationText',
            {
              defaultMessage:
                'The watch is now ready and will send error reports for {serviceName}.',
              values: {
                serviceName: this.props.urlParams.serviceName
              }
            }
          )}{' '}
          <KibanaCoreContext.Provider value={core}>
            <KibanaLink
              path={`/management/elasticsearch/watcher/watches/watch/${id}`}
            >
              {i18n.translate(
                'xpack.apm.serviceDetails.enableErrorReportsPanel.watchCreatedNotificationText.viewWatchLinkText',
                {
                  defaultMessage: 'View watch'
                }
              )}
            </KibanaLink>
          </KibanaCoreContext.Provider>
        </p>
      )
    });
  };

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const dailyTime = this.state.daily;
    const inputTime = `${dailyTime}Z`; // Add tz to make into UTC
    const inputFormat = 'HH:mmZ'; // Parse as 24 hour w. tz
    const dailyTimeFormatted = moment(inputTime, inputFormat).format('HH:mm'); // Format as 24h
    const dailyTime12HourFormatted = moment(inputTime, inputFormat).format(
      'hh:mm A (z)'
    ); // Format as 12h w. tz

    // Generate UTC hours for Daily Report select field
    const intervalHours = range(24).map(i => {
      const hour = padLeft(i.toString(), 2, '0');
      return { value: `${hour}:00`, text: `${hour}:00 UTC` };
    });

    const flyoutBody = (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.apm.serviceDetails.enableErrorReportsPanel.formDescription"
            defaultMessage="This form will assist in creating a Watch that can notify you of error occurrences from this service.
              To learn more about Watcher, please read our {documentationLink}."
            values={{
              documentationLink: (
                <ElasticDocsLink
                  target="_blank"
                  section="/x-pack"
                  path="/watcher-getting-started.html"
                >
                  {i18n.translate(
                    'xpack.apm.serviceDetails.enableErrorReportsPanel.formDescription.documentationLinkText',
                    {
                      defaultMessage: 'documentation'
                    }
                  )}
                </ElasticDocsLink>
              )
            }}
          />
        </p>

        <EuiForm>
          <h4>
            {i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.conditionTitle',
              {
                defaultMessage: 'Condition'
              }
            )}
          </h4>
          <EuiFormRow
            label={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.occurrencesThresholdLabel',
              {
                defaultMessage: 'Occurrences threshold per error group'
              }
            )}
            helpText={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.occurrencesThresholdHelpText',
              {
                defaultMessage:
                  'Threshold to be met for error group to be included in report.'
              }
            )}
            compressed
          >
            <EuiFieldNumber
              icon="number"
              min={1}
              value={this.state.threshold}
              onChange={this.onChangeThreshold}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <h4>
            {i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.triggerScheduleTitle',
              {
                defaultMessage: 'Trigger schedule'
              }
            )}
          </h4>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.triggerScheduleDescription',
              {
                defaultMessage:
                  'Choose the time interval for the report, when the threshold is exceeded.'
              }
            )}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiRadio
            id="daily"
            label={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.dailyReportRadioButtonLabel',
              {
                defaultMessage: 'Daily report'
              }
            )}
            onChange={() => this.onChangeSchedule('daily')}
            checked={this.state.schedule === 'daily'}
          />
          <EuiSpacer size="m" />
          <EuiFormRow
            helpText={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.dailyReportHelpText',
              {
                defaultMessage:
                  'The daily report will be sent at {dailyTimeFormatted} / {dailyTime12HourFormatted}.',
                values: { dailyTimeFormatted, dailyTime12HourFormatted }
              }
            )}
            compressed
          >
            <EuiSelect
              value={dailyTime}
              onChange={this.onChangeDailyUnit}
              options={intervalHours}
              disabled={this.state.schedule !== 'daily'}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiRadio
            id="interval"
            label={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.intervalRadioButtonLabel',
              {
                defaultMessage: 'Interval'
              }
            )}
            onChange={() => this.onChangeSchedule('interval')}
            checked={this.state.schedule === 'interval'}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <SmallInput>
                <EuiFormRow
                  helpText={i18n.translate(
                    'xpack.apm.serviceDetails.enableErrorReportsPanel.intervalHelpText',
                    {
                      defaultMessage: 'Time interval between reports.'
                    }
                  )}
                  compressed
                >
                  <EuiFieldNumber
                    compressed
                    icon="clock"
                    min={1}
                    value={this.state.interval.value}
                    onChange={this.onChangeIntervalValue}
                    disabled={this.state.schedule !== 'interval'}
                  />
                </EuiFormRow>
              </SmallInput>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow compressed>
                <EuiSelect
                  value={this.state.interval.unit}
                  onChange={this.onChangeIntervalUnit}
                  compressed
                  options={[
                    {
                      value: 'm',
                      text: i18n.translate(
                        'xpack.apm.serviceDetails.enableErrorReportsPanel.intervalUnit.minsLabel',
                        {
                          defaultMessage: 'mins'
                        }
                      )
                    },
                    {
                      value: 'h',
                      text: i18n.translate(
                        'xpack.apm.serviceDetails.enableErrorReportsPanel.intervalUnit.hrsLabel',
                        {
                          defaultMessage: 'hrs'
                        }
                      )
                    }
                  ]}
                  disabled={this.state.schedule !== 'interval'}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <h4>
            {i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.actionsTitle',
              {
                defaultMessage: 'Actions'
              }
            )}
          </h4>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.actionsDescription',
              {
                defaultMessage:
                  'Reports can be sent by email or posted to a Slack channel. Each report will include the top 10 errors sorted by occurrence.'
              }
            )}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.sendEmailLabel',
              {
                defaultMessage: 'Send email'
              }
            )}
            checked={this.state.actions.email}
            onChange={() => this.onChangeAction('email')}
          />
          <EuiSpacer size="m" />
          {this.state.actions.email && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.serviceDetails.enableErrorReportsPanel.recipientsLabel',
                {
                  defaultMessage: 'Recipients (separated with comma)'
                }
              )}
              compressed
              helpText={
                <span>
                  <FormattedMessage
                    id="xpack.apm.serviceDetails.enableErrorReportsPanel.recipientsHelpText"
                    defaultMessage="If you have not configured email, please see the {documentationLink}."
                    values={{
                      documentationLink: (
                        <ElasticDocsLink
                          target="_blank"
                          section="/x-pack"
                          path="/actions-email.html#configuring-email"
                        >
                          {i18n.translate(
                            'xpack.apm.serviceDetails.enableErrorReportsPanel.recipientsHelpText.documentationLinkText',
                            {
                              defaultMessage: 'documentation'
                            }
                          )}
                        </ElasticDocsLink>
                      )
                    }}
                  />
                </span>
              }
            >
              <EuiFieldText
                compressed
                icon="user"
                value={this.state.emails}
                onChange={this.onChangeEmails}
              />
            </EuiFormRow>
          )}
          <EuiSpacer size="m" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.apm.serviceDetails.enableErrorReportsPanel.sendSlackNotificationLabel',
              {
                defaultMessage: 'Send Slack notification'
              }
            )}
            checked={this.state.actions.slack}
            onChange={() => this.onChangeAction('slack')}
          />
          <EuiSpacer size="m" />
          {this.state.actions.slack && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.apm.serviceDetails.enableErrorReportsPanel.slackWebhookURLLabel',
                {
                  defaultMessage: 'Slack Webhook URL'
                }
              )}
              compressed
              helpText={
                <span>
                  <FormattedMessage
                    id="xpack.apm.serviceDetails.enableErrorReportsPanel.slackWebhookURLHelpText"
                    defaultMessage="To get a Slack webhook, please see the {documentationLink}."
                    values={{
                      documentationLink: (
                        <EuiLink
                          target="_blank"
                          href="https://get.slack.help/hc/en-us/articles/115005265063-Incoming-WebHooks-for-Slack"
                        >
                          {i18n.translate(
                            'xpack.apm.serviceDetails.enableErrorReportsPanel.slackWebhookURLHelpText.documentationLinkText',
                            {
                              defaultMessage: 'documentation'
                            }
                          )}
                        </EuiLink>
                      )
                    }}
                  />
                </span>
              }
            >
              <EuiFieldText
                compressed
                icon="link"
                value={this.state.slackUrl}
                onChange={this.onChangeSlackUrl}
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiText>
    );

    return (
      <EuiFlyout onClose={this.props.onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              {i18n.translate(
                'xpack.apm.serviceDetails.enableErrorReportsPanel.enableErrorReportsTitle',
                {
                  defaultMessage: 'Enable error reports'
                }
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{flyoutBody}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <PluginsContext.Consumer>
                {({ apm }) => {
                  return (
                    <EuiButton
                      onClick={this.createWatch(apm.config)}
                      fill
                      disabled={
                        !this.state.actions.email && !this.state.actions.slack
                      }
                    >
                      {i18n.translate(
                        'xpack.apm.serviceDetails.enableErrorReportsPanel.createWatchButtonLabel',
                        {
                          defaultMessage: 'Create watch'
                        }
                      )}
                    </EuiButton>
                  );
                }}
              </PluginsContext.Consumer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
