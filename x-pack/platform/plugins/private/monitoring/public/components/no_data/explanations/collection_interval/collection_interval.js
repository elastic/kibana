/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCode,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { WhatIs } from '../../blurbs';
import { FormattedMessage } from '@kbn/i18n-react';

export class ExplainCollectionInterval extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { enabler } = this.props;
    enabler.enableCollectionInterval();
  }

  render() {
    const { reason, isCollectionIntervalUpdated, isCollectionIntervalUpdating } = this.props;
    const { context, property, data } = reason;

    const renderButton = () => (
      <Fragment>
        <WhatIs />
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionIntervalDescription"
              defaultMessage="We checked the {context} settings and found that {property}
              is set to {data}."
              values={{
                context,
                property: <EuiCode>{property}</EuiCode>,
                data: <EuiCode>{data}</EuiCode>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionInterval.wrongIntervalValueDescription"
              defaultMessage="The collection interval setting needs to be a positive integer
              (10s is recommended) in order for the collection agents to be active."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionInterval.changeIntervalDescription"
              defaultMessage="Would you like us to change it and enable monitoring?"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={true}
              onClick={this.handleClick}
              type="button"
              data-test-subj="enableCollectionInterval"
              isLoading={isCollectionIntervalUpdating}
            >
              <FormattedMessage
                id="xpack.monitoring.noData.explanations.collectionInterval.turnOnMonitoringButtonLabel"
                defaultMessage="Turn on monitoring"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
    const renderSuccess = () => (
      <Fragment>
        <EuiTitle size="l">
          <h2>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionInterval.monitoringTurnedOnTitle"
              defaultMessage="Success! Wait a moment please."
            />
          </h2>
        </EuiTitle>
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionInterval.monitoringTurnedOnDescription"
              defaultMessage="As soon as monitoring data appears in your
              cluster the page will automatically refresh with your monitoring
              dashboard. This only takes only a few seconds."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLoadingSpinner size="l" />
      </Fragment>
    );

    // prettier-ignore
    return (
      <Fragment>
        {isCollectionIntervalUpdated ? renderSuccess() : renderButton()}
      </Fragment>
    );
  }
}

ExplainCollectionInterval.propTypes = {
  enabler: PropTypes.object.isRequired,
  reason: PropTypes.object.isRequired,
  isCollectionIntervalUpdated: PropTypes.bool,
  isCollectionIntervalUpdating: PropTypes.bool,
};
