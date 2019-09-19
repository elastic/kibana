/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { MetricsEditor } from '../../../components/metrics_editor';
import { indexPatternService } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class UpdateSourceEditor extends Component {
  state = {
    fields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFields() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.source.pewPew.noIndexPatternErrorMessage', {
            defaultMessage: `Unable to find Index pattern {id}`,
            values: {
              id: this.props.indexPatternId,
            },
          }),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ fields: indexPattern.fields });
  }

  _onMetricsChange = metrics => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  };

  render() {
    return (
      <>
        <EuiTitle size="xxs">
          <h6>
            <FormattedMessage id="xpack.maps.source.pewPew.metricsLabel" defaultMessage="Metrics" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="s" />
        <MetricsEditor
          allowMultipleMetrics={true}
          fields={this.state.fields}
          metrics={this.props.metrics}
          onChange={this._onMetricsChange}
        />
      </>
    );
  }
}
