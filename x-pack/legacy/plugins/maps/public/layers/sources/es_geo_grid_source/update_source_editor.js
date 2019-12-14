/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';

import { RENDER_AS } from './render_as';
import { MetricsEditor } from '../../../components/metrics_editor';
import { indexPatternService } from '../../../kibana_services';
import { ResolutionEditor } from './resolution_editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

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
          loadError: i18n.translate('xpack.maps.source.esGrid.noIndexPatternErrorMessage', {
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

  _onResolutionChange = e => {
    this.props.onChange({ propName: 'resolution', value: e });
  };

  _renderMetricsEditor() {
    const metricsFilter =
      this.props.renderAs === RENDER_AS.HEATMAP
        ? metric => {
            //these are countable metrics, where blending heatmap color blobs make sense
            return ['count', 'sum'].includes(metric.value);
          }
        : null;
    const allowMultipleMetrics = this.props.renderAs !== RENDER_AS.HEATMAP;
    return (
      <div>
        <EuiTitle size="xxs">
          <h6>
            <FormattedMessage id="xpack.maps.source.esGrid.metricsLabel" defaultMessage="Metrics" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="s" />
        <MetricsEditor
          allowMultipleMetrics={allowMultipleMetrics}
          metricsFilter={metricsFilter}
          fields={this.state.fields}
          metrics={this.props.metrics}
          onChange={this._onMetricsChange}
        />
      </div>
    );
  }

  render() {
    return (
      <Fragment>
        <ResolutionEditor resolution={this.props.resolution} onChange={this._onResolutionChange} />
        <EuiSpacer size="m" />
        {this._renderMetricsEditor()}
      </Fragment>
    );
  }
}
