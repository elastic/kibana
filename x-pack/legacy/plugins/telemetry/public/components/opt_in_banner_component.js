/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { OptInMessage } from './opt_in_message';

/**
 * React component for displaying the Telemetry opt-in banner.
 *
 * TODO: When Jest tests become available in X-Pack, we should add one for this component.
 */
export class OptInBanner extends Component {
  static propTypes = {
    /**
     * Callback function with no parameters that returns a {@code Promise} containing the
     * telemetry data (expected to be an array).
     */
    fetchTelemetry: PropTypes.func.isRequired,
    /**
     * Callback function passed a boolean to opt in ({@code true}) or out ({@code false}).
     */
    optInClick: PropTypes.func.isRequired,
  };

  render() {
    const title = (
      <FormattedMessage
        id="xpack.telemetry.welcomeBanner.title"
        defaultMessage="Help us improve the Elastic Stack!"
      />
    );
    return (
      <EuiCallOut iconType="questionInCircle" title={title}>
        <OptInMessage fetchTelemetry={this.props.fetchTelemetry} />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => this.props.optInClick(true)}
            >
              <FormattedMessage
                id="xpack.telemetry.welcomeBanner.yesButtonLabel"
                defaultMessage="Yes"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => this.props.optInClick(false)}
            >
              <FormattedMessage
                id="xpack.telemetry.welcomeBanner.noButtonLabel"
                defaultMessage="No"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
}
