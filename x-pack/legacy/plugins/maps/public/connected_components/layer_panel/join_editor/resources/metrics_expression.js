/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormErrorText,
  EuiFormHelpText,
} from '@elastic/eui';
import { MetricsEditor } from '../../../../components/metrics_editor';
import { FormattedMessage } from '@kbn/i18n/react';
export class MetricsExpression extends Component {
  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _renderMetricsEditor = () => {
    if (!this.props.rightFields) {
      return (
        <EuiFormErrorText>
          <FormattedMessage
            id="xpack.maps.layerPanel.metricsExpression.joinMustBeSetErrorMessage"
            defaultMessage="JOIN must be set"
          />
        </EuiFormErrorText>
      );
    }

    return (
      <MetricsEditor
        fields={this.props.rightFields}
        metrics={this.props.metrics}
        onChange={this.props.onChange}
      />
    );
  };

  render() {
    const metricExpressions = this.props.metrics
      .filter(({ type, field }) => {
        if (type === 'count') {
          return true;
        }

        if (field) {
          return true;
        }
        return false;
      })
      .map(({ type, field }) => {
        // do not use metric label so field and aggregation are not obscured.
        if (type === 'count') {
          return 'count';
        }

        return `${type} ${field}`;
      });
    const useMetricDescription = i18n.translate(
      'xpack.maps.layerPanel.metricsExpression.useMetricsDescription',
      {
        defaultMessage: '{metricsLength, plural, one {and use metric} other {and use metrics}}',
        values: {
          metricsLength: metricExpressions.length,
        },
      }
    );
    return (
      <EuiPopover
        id="metricsPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        withTitle
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description={useMetricDescription}
            uppercase={false}
            value={metricExpressions.length > 0 ? metricExpressions.join(', ') : 'count'}
          />
        }
      >
        <div style={{ width: 400 }}>
          <EuiPopoverTitle>
            <FormattedMessage
              id="xpack.maps.layerPanel.metricsExpression.metricsPopoverTitle"
              defaultMessage="Metrics"
            />
          </EuiPopoverTitle>
          <EuiFormHelpText className="mapJoinExpressionHelpText">
            <FormattedMessage
              id="xpack.maps.layerPanel.metricsExpression.helpText"
              defaultMessage="Configure the metrics for the right source. These values are added to the layer features."
            />
          </EuiFormHelpText>
          {this._renderMetricsEditor()}
        </div>
      </EuiPopover>
    );
  }
}

MetricsExpression.propTypes = {
  metrics: PropTypes.array,
  rightFields: PropTypes.array,
  onChange: PropTypes.func.isRequired,
};

MetricsExpression.defaultProps = {
  metrics: [{ type: 'count' }],
};
