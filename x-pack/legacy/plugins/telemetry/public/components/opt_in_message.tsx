/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { getConfigTelemetryDesc, PRIVACY_STATEMENT_URL } from '../../common/constants';
import { OptInExampleFlyout } from './opt_in_details_component';

interface Props {
  fetchTelemetry: () => Promise<any[]>;
}

interface State {
  showDetails: boolean;
  showExample: boolean;
}

export class OptInMessage extends React.PureComponent<Props, State> {
  public readonly state: State = {
    showDetails: false,
    showExample: false,
  };

  toggleShowExample = () => {
    this.setState(prevState => ({
      showExample: !prevState.showExample,
    }));
  };

  render() {
    const { showDetails, showExample } = this.state;

    const getDetails = () => (
      <EuiText size="s">
        <p tab-index="0">
          <FormattedMessage
            id="xpack.telemetry.welcomeBanner.telemetryConfigDetailsDescription"
            defaultMessage="No information about the data you process or store will be sent. This feature
              will periodically send basic feature usage statistics. See an {exampleLink} or read our {telemetryPrivacyStatementLink}.
              You can disable this feature at any time."
            values={{
              exampleLink: (
                <EuiLink onClick={this.toggleShowExample}>
                  <FormattedMessage
                    id="xpack.telemetry.welcomeBanner.telemetryConfigDetailsDescription.exampleLinkText"
                    defaultMessage="example"
                  />
                </EuiLink>
              ),
              telemetryPrivacyStatementLink: (
                <EuiLink href={PRIVACY_STATEMENT_URL} target="_blank">
                  <FormattedMessage
                    id="xpack.telemetry.welcomeBanner.telemetryConfigDetailsDescription.telemetryPrivacyStatementLinkText"
                    defaultMessage="telemetry privacy statement"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    );

    const getFlyoutDetails = () => (
      <OptInExampleFlyout
        onClose={() => this.setState({ showExample: false })}
        fetchTelemetry={this.props.fetchTelemetry}
      />
    );

    const getReadMore = () => (
      <EuiLink onClick={() => this.setState({ showDetails: true })}>
        <FormattedMessage
          id="xpack.telemetry.welcomeBanner.telemetryConfigDescription.readMoreLinkText"
          defaultMessage="Read more"
        />
      </EuiLink>
    );

    return (
      <React.Fragment>
        <EuiText>
          <p tab-index="0">
            {getConfigTelemetryDesc()} {!showDetails && getReadMore()}
          </p>
        </EuiText>
        {showDetails && getDetails()}
        {showDetails && showExample && getFlyoutDetails()}
      </React.Fragment>
    );
  }
}
