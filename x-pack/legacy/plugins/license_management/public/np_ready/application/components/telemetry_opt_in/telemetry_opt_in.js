/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiLink,
  EuiCheckbox,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPopover
} from '@elastic/eui';
import { shouldShowTelemetryOptIn, getTelemetryFetcher, PRIVACY_STATEMENT_URL, OptInExampleFlyout } from '../../lib/telemetry';
import { FormattedMessage } from '@kbn/i18n/react';

export class TelemetryOptIn extends React.Component {
  constructor() {
    super();
    this.state = {
      showMoreTelemetryInfo: false,
      isOptingInToTelemetry: false,
      showExample: false
    };
  }
  isOptingInToTelemetry = () => {
    return this.state.isOptingInToTelemetry;
  }
  closeReadMorePopover = () => {
    this.setState({ showMoreTelemetryInfo: false });
  }
  onClickReadMore = () => {
    const { showMoreTelemetryInfo } = this.state;
    this.setState({ showMoreTelemetryInfo: !showMoreTelemetryInfo });
  }
  onClickExample = () => {
    this.setState({ showExample: true });
    this.closeReadMorePopover();
  }
  onChangeOptIn = event => {
    const isOptingInToTelemetry = event.target.checked;
    this.setState({ isOptingInToTelemetry });
  }
  render() {
    const { showMoreTelemetryInfo, isOptingInToTelemetry, showExample } = this.state;
    const { isStartTrial } = this.props;

    let example = null;
    if (showExample) {
      example = (
        <OptInExampleFlyout
          onClose={() => this.setState({ showExample: false })}
          fetchTelemetry={getTelemetryFetcher}
        />
      );
    }

    let toCurrentCustomers;
    if (!isStartTrial) {
      toCurrentCustomers = (
        <Fragment>
          <EuiSpacer  size="s"/>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.licenseMgmt.telemetryOptIn.customersHelpSupportDescription"
                defaultMessage="Help Elastic support provide better service"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer  size="s"/>
        </Fragment>
      );
    }

    const readMoreButton = (
      <EuiLink onClick={this.onClickReadMore}>
        <FormattedMessage
          id="xpack.licenseMgmt.telemetryOptIn.readMoreLinkText"
          defaultMessage="Read more"
        />
      </EuiLink>
    );

    const popover = (
      <EuiPopover
        ownFocus
        id="readMorePopover"
        button={readMoreButton}
        isOpen={showMoreTelemetryInfo}
        closePopover={this.closeReadMorePopover}
        className="eui-AlignBaseline"
      >
        <EuiText className="licManagement__narrowText" >
          <p>
            <FormattedMessage
              id="xpack.licenseMgmt.telemetryOptIn.featureUsageWarningMessage"
              defaultMessage="This feature periodically sends basic feature usage statistics.
              This information will not be shared outside of Elastic.
              See an {exampleLink} or read our {telemetryPrivacyStatementLink}.
              You can disable this feature any time."
              values={{
                exampleLink: (
                  <EuiLink onClick={this.onClickExample}>
                    <FormattedMessage
                      id="xpack.licenseMgmt.telemetryOptIn.exampleLinkText"
                      defaultMessage="example"
                    />
                  </EuiLink>),
                telemetryPrivacyStatementLink: (
                  <EuiLink
                    href={PRIVACY_STATEMENT_URL}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.licenseMgmt.telemetryOptIn.telemetryPrivacyStatementLinkText"
                      defaultMessage="telemetry privacy statement"
                    />
                  </EuiLink>
                )
              }}
            />
          </p>
        </EuiText>
      </EuiPopover>
    );

    return shouldShowTelemetryOptIn() ? (
      <Fragment>
        {example}
        {toCurrentCustomers}
        <EuiCheckbox
          label={
            <span>
              <FormattedMessage
                id="xpack.licenseMgmt.telemetryOptIn.sendBasicFeatureStatisticsLabel"
                defaultMessage="Send basic feature usage statistics to Elastic periodically. {popover}"
                values={{
                  popover
                }}
              />
            </span>
          }
          id="isOptingInToTelemetry"
          checked={isOptingInToTelemetry}
          onChange={this.onChangeOptIn}
        />
      </Fragment>
    ) : null;
  }
}
