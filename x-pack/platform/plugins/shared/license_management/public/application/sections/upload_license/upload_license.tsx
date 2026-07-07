/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { History } from 'history';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiForm,
  EuiSpacer,
  EuiConfirmModal,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiPanel,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { TelemetryOptIn } from '../../components/telemetry_opt_in';
import { shouldShowTelemetryOptIn } from '../../lib/telemetry';
import type { TelemetryPluginStart } from '../../lib/telemetry';

import type { UploadStatusState } from '../../store/types';

export interface Props {
  currentLicenseType: string;
  applying: boolean;
  needsAcknowledgement: boolean;
  messages?: Array<string | string[]>;
  errorMessage: string;
  isInvalid: boolean;
  telemetry?: TelemetryPluginStart;
  history: ScopedHistory | History;
  setBreadcrumb: (section: 'dashboard' | 'upload') => void;
  addUploadErrorMessage: (message: string | React.ReactNode) => void;
  uploadLicense: (license: string, currentType: string, acknowledge?: boolean) => void;
  uploadLicenseStatus: (status: UploadStatusState) => void;
}

interface State {
  isOptingInToTelemetry: boolean;
}

export class UploadLicense extends React.PureComponent<Props, State> {
  private file: File | undefined;

  state: State = {
    isOptingInToTelemetry: false,
  };

  componentDidMount() {
    this.props.setBreadcrumb('upload');
    this.props.addUploadErrorMessage('');
  }
  onOptInChange = (isOptingInToTelemetry: boolean) => {
    this.setState({ isOptingInToTelemetry });
  };
  send = (acknowledge?: boolean) => {
    const file = this.file;
    if (!file) {
      return;
    }
    const fr = new FileReader();

    fr.onload = ({ target }) => {
      const result = typeof target?.result === 'string' ? target.result : '';
      if (this.state.isOptingInToTelemetry) {
        this.props.telemetry?.telemetryService.setOptIn(true);
      }
      this.props.uploadLicense(result, this.props.currentLicenseType, acknowledge);
    };
    fr.readAsText(file);
  };

  cancel = () => {
    this.props.uploadLicenseStatus({});
  };

  acknowledgeModal() {
    const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');
    const { needsAcknowledgement, messages: [firstLine, ...messages] = [] } = this.props;
    if (!needsAcknowledgement) {
      return null;
    }
    return (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        titleProps={{ id: confirmModalTitleId }}
        title={
          <FormattedMessage
            id="xpack.licenseMgmt.uploadLicense.confirmModalTitle"
            defaultMessage="Confirm License Upload"
          />
        }
        onCancel={this.cancel}
        onConfirm={() => this.send(true)}
        cancelButtonText={
          <FormattedMessage
            id="xpack.licenseMgmt.uploadLicense.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.licenseMgmt.uploadLicense.confirmModal.confirmButtonLabel"
            defaultMessage="Confirm"
          />
        }
      >
        <div>
          <EuiText>{firstLine}</EuiText>
          <EuiText>
            <ul>
              {messages.map((message) => (
                <li key={String(message)}>{message}</li>
              ))}
            </ul>
          </EuiText>
        </div>
      </EuiConfirmModal>
    );
  }
  errorMessage(): string[] | null {
    const { errorMessage } = this.props;
    if (!errorMessage) {
      return null;
    }
    return [errorMessage];
  }
  handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      this.props.addUploadErrorMessage('');
    }
    this.file = file;
  };
  submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (this.file) {
      this.send();
    } else {
      this.props.addUploadErrorMessage(
        <FormattedMessage
          id="xpack.licenseMgmt.uploadLicense.licenseFileNotSelectedErrorMessage"
          defaultMessage="You must select a license file."
        />
      );
    }
  };
  render() {
    const { currentLicenseType, applying, telemetry, history } = this.props;

    return (
      <EuiPageSection alignment="center" grow={true}>
        <EuiPanel color="subdued" paddingSize="l">
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.licenseMgmt.uploadLicense.uploadLicenseTitle"
                defaultMessage="Upload your license"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer />

          {this.acknowledgeModal()}

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.licenseMgmt.uploadLicense.licenseKeyTypeDescription"
                defaultMessage="Your license key is a JSON file with a signature attached."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.licenseMgmt.uploadLicense.replacingCurrentLicenseWarningMessage"
                defaultMessage="Uploading a license will replace your current {currentLicenseType} license."
                values={{
                  currentLicenseType: <strong>{currentLicenseType.toUpperCase()}</strong>,
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiForm isInvalid={!!this.errorMessage()} error={this.errorMessage()}>
            <EuiFilePicker
              fullWidth
              id="licenseFile"
              initialPromptText={
                <FormattedMessage
                  id="xpack.licenseMgmt.uploadLicense.selectLicenseFileDescription"
                  defaultMessage="Select or drag your license file"
                />
              }
              onChange={this.handleFile}
            />

            <EuiSpacer size="m" />
            {shouldShowTelemetryOptIn(telemetry) && (
              <TelemetryOptIn
                isStartTrial={false}
                isOptingInToTelemetry={this.state.isOptingInToTelemetry}
                onOptInChange={this.onOptInChange}
                telemetry={telemetry}
              />
            )}
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="cancelUploadButton"
                  {...reactRouterNavigate(history, '/home')}
                >
                  <FormattedMessage
                    id="xpack.licenseMgmt.uploadLicense.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="uploadLicenseButton"
                  fill
                  isLoading={applying}
                  onClick={this.submit}
                >
                  {applying ? (
                    <FormattedMessage
                      id="xpack.licenseMgmt.uploadLicense.uploadingButtonLabel"
                      defaultMessage="Uploading…"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.licenseMgmt.uploadLicense.uploadButtonLabel"
                      defaultMessage="Upload"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      </EuiPageSection>
    );
  }
}
