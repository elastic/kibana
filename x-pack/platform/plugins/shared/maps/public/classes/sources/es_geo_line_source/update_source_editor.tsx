/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { indexPatterns } from '@kbn/data-plugin/public';
import { MetricsEditor } from '../../../components/metrics_editor';
import { getIndexPatternService } from '../../../kibana_services';
import { GeoLineForm } from './geo_line_form';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';

interface Props {
  bucketsName: string;
  indexPatternId: string;
  groupByTimeseries: boolean;
  lineSimplificationSize: number;
  splitField: string;
  sortField: string;
  metrics: AggDescriptor[];
  onChange: (...args: OnSourceChangeArgs[]) => void;
}

interface State {
  indexPattern: DataView | null;
  fields: DataViewField[];
}

export class UpdateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexPattern: null,
    fields: [],
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
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      indexPattern,
      fields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
    });
  }

  _onMetricsChange = (metrics: AggDescriptor[]) => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  };

  _onGroupByTimeseriesChange = (value: boolean) => {
    this.props.onChange({ propName: 'groupByTimeseries', value });
  };

  _onLineSimplificationSizeChange = (value: number) => {
    this.props.onChange({ propName: 'lineSimplificationSize', value });
  };

  _onSplitFieldChange = (value: string) => {
    this.props.onChange({ propName: 'splitField', value });
  };

  _onSortFieldChange = (value: string) => {
    this.props.onChange({ propName: 'sortField', value });
  };

  render() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.maps.source.esGeoLine.metricsLabel"
                defaultMessage="Track metrics"
              />
            </h6>
          </EuiTitle>
          <EuiSpacer size="m" />
          <MetricsEditor
            allowMultipleMetrics={true}
            bucketsName={this.props.bucketsName}
            isJoin={false}
            fields={this.state.fields}
            metrics={this.props.metrics}
            onChange={this._onMetricsChange}
          />
        </EuiPanel>
        <EuiSpacer size="s" />

        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.maps.source.esGeoLine.trackSettingsLabel"
                defaultMessage="Tracks"
              />
            </h6>
          </EuiTitle>
          <EuiSpacer size="m" />
          <GeoLineForm
            isColumnCompressed={true}
            indexPattern={this.state.indexPattern}
            onGroupByTimeseriesChange={this._onGroupByTimeseriesChange}
            onLineSimplificationSizeChange={this._onLineSimplificationSizeChange}
            onSortFieldChange={this._onSortFieldChange}
            onSplitFieldChange={this._onSplitFieldChange}
            groupByTimeseries={this.props.groupByTimeseries}
            lineSimplificationSize={this.props.lineSimplificationSize}
            sortField={this.props.sortField}
            splitField={this.props.splitField}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
