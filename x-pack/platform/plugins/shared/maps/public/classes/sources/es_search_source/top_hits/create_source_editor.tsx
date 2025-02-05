/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';

import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { SortDirection } from '@kbn/data-plugin/public';
import { SCALING_TYPES } from '../../../../../common/constants';
import { GeoFieldSelect } from '../../../../components/geo_field_select';
import { GeoIndexPatternSelect } from '../../../../components/geo_index_pattern_select';
import {
  getGeoFields,
  getTermsFields,
  getSortFields,
  getIsTimeseries,
} from '../../../../index_pattern_util';
import { ESSearchSourceDescriptor } from '../../../../../common/descriptor_types';
import { TopHitsForm } from './top_hits_form';
import { OnSourceChangeArgs } from '../../source';

interface Props {
  onSourceConfigChange: (
    sourceConfig: Partial<ESSearchSourceDescriptor> | null,
    isPointsOnly: boolean
  ) => void;
}

interface State {
  indexPattern: DataView | null;
  isTimeseries: boolean;
  geoFields: DataViewField[];
  geoFieldName: string | null;
  sortField: string | null;
  sortFields: DataViewField[];
  sortOrder: SortDirection;
  termFields: DataViewField[];
  topHitsGroupByTimeseries: boolean;
  topHitsSplitField: string | null;
  topHitsSize: number;
}

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {
    indexPattern: null,
    isTimeseries: false,
    geoFields: [],
    geoFieldName: null,
    sortField: null,
    sortFields: [],
    sortOrder: SortDirection.desc,
    termFields: [],
    topHitsGroupByTimeseries: false,
    topHitsSplitField: null,
    topHitsSize: 1,
  };

  _onIndexPatternSelect = (indexPattern: DataView) => {
    const geoFields = getGeoFields(indexPattern.fields);
    const isTimeseries = getIsTimeseries(indexPattern);

    this.setState(
      {
        indexPattern,
        isTimeseries,
        geoFields,
        geoFieldName: geoFields.length ? geoFields[0].name : null,
        sortField: indexPattern.timeFieldName ? indexPattern.timeFieldName : null,
        sortFields: getSortFields(indexPattern.fields),
        termFields: getTermsFields(indexPattern.fields),
        topHitsGroupByTimeseries: isTimeseries,
        topHitsSplitField: null,
      },
      this._previewLayer
    );
  };

  _onGeoFieldSelect = (geoFieldName?: string) => {
    this.setState({ geoFieldName: geoFieldName ? geoFieldName : null }, this._previewLayer);
  };

  _onTopHitsPropChange = ({ propName, value }: OnSourceChangeArgs) => {
    this.setState(
      // @ts-expect-error
      { [propName]: value },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const {
      indexPattern,
      geoFieldName,
      sortField,
      sortOrder,
      topHitsGroupByTimeseries,
      topHitsSplitField,
      topHitsSize,
    } = this.state;

    const tooltipProperties: string[] = [];
    if (topHitsGroupByTimeseries) {
      const timeSeriesDimensionFieldNames = (indexPattern?.fields ?? [])
        .filter((field) => {
          return field.timeSeriesDimension;
        })
        .map((field) => {
          return field.name;
        });
      tooltipProperties.push(...timeSeriesDimensionFieldNames);
    } else if (topHitsSplitField) {
      tooltipProperties.push(topHitsSplitField);
    }
    if (indexPattern && indexPattern.timeFieldName) {
      tooltipProperties.push(indexPattern.timeFieldName);
    }

    const field = geoFieldName && indexPattern?.getFieldByName(geoFieldName);

    const sourceConfig =
      indexPattern && geoFieldName && sortField && (topHitsGroupByTimeseries || topHitsSplitField)
        ? {
            indexPatternId: indexPattern.id,
            geoField: geoFieldName,
            scalingType: SCALING_TYPES.TOP_HITS,
            sortField,
            sortOrder,
            tooltipProperties,
            topHitsGroupByTimeseries,
            topHitsSplitField: topHitsSplitField ? topHitsSplitField : undefined,
            topHitsSize,
          }
        : null;
    const isPointsOnly = field ? field.type === 'geo_point' : false;
    this.props.onSourceConfigChange(sourceConfig, isPointsOnly);
  };

  _renderGeoSelect() {
    return this.state.indexPattern ? (
      <GeoFieldSelect
        value={this.state.geoFieldName ? this.state.geoFieldName : ''}
        onChange={this._onGeoFieldSelect}
        geoFields={this.state.geoFields}
      />
    ) : null;
  }

  _renderTopHitsPanel() {
    if (!this.state.indexPattern || !this.state.indexPattern.id || !this.state.geoFieldName) {
      return null;
    }

    return (
      <TopHitsForm
        indexPatternId={this.state.indexPattern.id}
        isColumnCompressed={false}
        isTimeseries={this.state.isTimeseries}
        onChange={this._onTopHitsPropChange}
        sortField={this.state.sortField ? this.state.sortField : ''}
        sortFields={this.state.sortFields}
        sortOrder={this.state.sortOrder}
        termFields={this.state.termFields}
        topHitsGroupByTimeseries={this.state.topHitsGroupByTimeseries}
        topHitsSplitField={this.state.topHitsSplitField}
        topHitsSize={this.state.topHitsSize}
      />
    );
  }

  render() {
    return (
      <EuiPanel>
        <GeoIndexPatternSelect
          dataView={this.state.indexPattern}
          onChange={this._onIndexPatternSelect}
        />

        {this._renderGeoSelect()}

        {this._renderTopHitsPanel()}
      </EuiPanel>
    );
  }
}
