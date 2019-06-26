/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiCopy: React.SFC<any>;
}

import {
  EuiButton,
  EuiCopy as EuiCopyTyped,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, ReactElement } from 'react';
import { KFetchError } from 'ui/kfetch/kfetch_error';
import { toastNotifications } from 'ui/notify';
import url from 'url';
import { reportingClient } from '../lib/reporting_client';

interface Props {
  reportType: string;
  layoutId: string | undefined;
  objectId?: string;
  objectType: string;
  getJobParams: () => any;
  options?: ReactElement<any>;
  isDirty: boolean;
  onClose: () => void;
  intl: InjectedIntl;
}

interface State {
  isStale: boolean;
  absoluteUrl: string;
  layoutId: string;
}

class ReportingPanelContentUi extends Component<Props, State> {
  public static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.layoutId !== prevState.layoutId) {
      return {
        ...prevState,
        absoluteUrl: ReportingPanelContentUi.getAbsoluteReportGenerationUrl(nextProps),
      };
    }
    return prevState;
  }

  private static getAbsoluteReportGenerationUrl = (props: Props) => {
    const relativePath = reportingClient.getReportingJobPath(
      props.reportType,
      props.getJobParams()
    );
    return url.resolve(window.location.href, relativePath);
  };
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isStale: false,
      absoluteUrl: '',
      layoutId: '',
    };
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.markAsStale);
    window.removeEventListener('resize', this.setAbsoluteReportGenerationUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.markAsStale, false);
    window.addEventListener('resize', this.setAbsoluteReportGenerationUrl);
  }

  public render() {
    if (this.isNotSaved() || this.props.isDirty || this.state.isStale) {
      return (
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
          <EuiFormRow
            helpText={
              <FormattedMessage
                id="xpack.reporting.panelContent.saveWorkDescription"
                defaultMessage="Please save your work before generating a report."
              />
            }
          >
            {this.renderGenerateReportButton(true)}
          </EuiFormRow>
        </EuiForm>
      );
    }

    const reportMsg = (
      <FormattedMessage
        id="xpack.reporting.panelContent.generationTimeDescription"
        defaultMessage="{reportingType}s can take a minute or two to generate based upon the size of your {objectType}."
        description="Here 'reportingType' can be 'PDF' or 'CSV'"
        values={{
          reportingType: this.prettyPrintReportingType(),
          objectType: this.props.objectType,
        }}
      />
    );

    return (
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiText size="s">
          <p>{reportMsg}</p>
        </EuiText>
        <EuiSpacer size="s" />

        {this.props.options}

        {this.renderGenerateReportButton(false)}
        <EuiSpacer size="s" />

        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.reporting.panelContent.howToCallGenerationDescription"
              defaultMessage="Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher."
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiCopyTyped
          textToCopy={this.state.absoluteUrl}
          anchorClassName="kbnShareContextMenu__copyAnchor"
        >
          {(copy: () => void) => (
            <EuiButton className="kbnShareContextMenu__copyButton" onClick={copy} size="s">
              <FormattedMessage
                id="xpack.reporting.panelContent.copyUrlButtonLabel"
                defaultMessage="Copy POST URL"
              />
            </EuiButton>
          )}
        </EuiCopyTyped>
      </EuiForm>
    );
  }

  private renderGenerateReportButton = (isDisabled: boolean) => {
    return (
      <EuiButton
        className="kbnShareContextMenu__copyButton"
        disabled={isDisabled}
        fill
        onClick={this.createReportingJob}
        data-test-subj="generateReportButton"
        size="s"
      >
        <FormattedMessage
          id="xpack.reporting.panelContent.generateButtonLabel"
          defaultMessage="Generate {reportingType}"
          values={{ reportingType: this.prettyPrintReportingType() }}
        />
      </EuiButton>
    );
  };

  private prettyPrintReportingType = () => {
    switch (this.props.reportType) {
      case 'printablePdf':
        return 'PDF';
      case 'csv':
        return 'CSV';
      case 'png':
        return 'PNG';
      default:
        return this.props.reportType;
    }
  };

  private markAsStale = () => {
    if (!this.mounted) {
      return;
    }

    this.setState({ isStale: true });
  };

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private setAbsoluteReportGenerationUrl = () => {
    if (!this.mounted) {
      return;
    }
    const absoluteUrl = ReportingPanelContentUi.getAbsoluteReportGenerationUrl(this.props);
    this.setState({ absoluteUrl });
  };

  private createReportingJob = () => {
    const { intl } = this.props;

    return reportingClient
      .createReportingJob(this.props.reportType, this.props.getJobParams())
      .then(() => {
        toastNotifications.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.reporting.panelContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType: this.props.objectType }
          ),
          text: (
            <FormattedMessage
              id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in Management"
            />
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        this.props.onClose();
      })
      .catch((kfetchError: KFetchError) => {
        if (kfetchError.message === 'not exportable') {
          return toastNotifications.addWarning({
            title: intl.formatMessage(
              {
                id: 'xpack.reporting.panelContent.whatCanBeExportedWarningTitle',
                defaultMessage: 'Only saved {objectType} can be exported',
              },
              { objectType: this.props.objectType }
            ),
            text: (
              <FormattedMessage
                id="xpack.reporting.panelContent.whatCanBeExportedWarningDescription"
                defaultMessage="Please save your work first"
              />
            ),
          });
        }

        const defaultMessage =
          kfetchError.res.status === 403 ? (
            <FormattedMessage
              id="xpack.reporting.panelContent.noPermissionToGenerateReportDescription"
              defaultMessage="You don't have permission to generate this report."
            />
          ) : (
            <FormattedMessage
              id="xpack.reporting.panelContent.notification.cantReachServerDescription"
              defaultMessage="Can't reach the server. Please try again."
            />
          );

        toastNotifications.addDanger({
          title: intl.formatMessage({
            id: 'xpack.reporting.panelContent.notification.reportingErrorTitle',
            defaultMessage: 'Reporting error',
          }),
          text: kfetchError.message || defaultMessage,
          'data-test-subj': 'queueReportError',
        });
      });
  };
}

export const ReportingPanelContent = injectI18n(ReportingPanelContentUi);
