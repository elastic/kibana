/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import { EuiFormRow, EuiSelect, EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SortDirection, indexPatterns } from '@kbn/data-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDataViewNotFoundMessage } from '../../../../common/i18n_getters';
import { FIELD_ORIGIN, SCALING_TYPES } from '../../../../common/constants';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { TooltipSelector } from '../../../components/tooltip_selector';

import { getIndexPatternService } from '../../../kibana_services';
import {
  getGeoTileAggNotSupportedReason,
  getSourceFields,
  supportsGeoTileAgg,
} from '../../../index_pattern_util';
import { ESDocField } from '../../fields/es_doc_field';
import { IESSource } from '../es_source';
import { OnSourceChangeArgs } from '../source';
import { IField } from '../../fields/field';
import { ScalingForm } from './util/scaling_form';

interface Props {
  indexPatternId: string;
  onChange(...args: OnSourceChangeArgs[]): void;
  tooltipFields: ESDocField[];
  sortField: string;
  sortOrder: SortDirection;
  scalingType: SCALING_TYPES;
  source: IESSource;
  hasSpatialJoins: boolean;
  numberOfJoins: number;
  getGeoField(): Promise<DataViewField>;
  filterByMapBounds: boolean;
}

interface State {
  loadError?: string;
  sourceFields: IField[] | null;
  sortFields: DataViewField[] | undefined;
  supportsClustering: boolean;
  clusteringDisabledReason: string | null;
}

export class UpdateSourceEditor extends Component<Props, State> {
  _isMounted: boolean = false;
  state: State = {
    sourceFields: null,
    sortFields: undefined,
    supportsClustering: false,
    clusteringDisabledReason: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: getDataViewNotFoundMessage(this.props.indexPatternId),
        });
      }
      return;
    }

    let geoField;
    try {
      geoField = await this.props.getGeoField();
    } catch (err) {
      if (this._isMounted) {
        this.setState({ loadError: err.message });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    // todo move this all to the source
    const rawTooltipFields = getSourceFields(indexPattern.fields);
    const sourceFields = rawTooltipFields.map((field) => {
      return new ESDocField({
        fieldName: field.name,
        source: this.props.source,
        origin: FIELD_ORIGIN.SOURCE,
      });
    });

    this.setState({
      supportsClustering: supportsGeoTileAgg(geoField),
      clusteringDisabledReason: getGeoTileAggNotSupportedReason(geoField),
      sourceFields,
      sortFields: indexPattern.fields.filter(
        (field) => field.sortable && !indexPatterns.isNestedField(field)
      ), // todo change sort fields to use fields
    });
  }
  _onTooltipPropertiesChange = (propertyNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _onSortFieldChange = (sortField?: string) => {
    this.props.onChange({ propName: 'sortField', value: sortField });
  };

  _onSortOrderChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.props.onChange({ propName: 'sortOrder', value: e.target.value });
  };

  _renderTooltipsPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.esSearch.tooltipsTitle"
              defaultMessage="Tooltip fields"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <TooltipSelector
          tooltipFields={this.props.tooltipFields}
          onChange={this._onTooltipPropertiesChange}
          fields={this.state.sourceFields}
        />
      </EuiPanel>
    );
  }

  _renderSortPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage id="xpack.maps.esSearch.sortTitle" defaultMessage="Sorting" />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortFieldLabel', {
            defaultMessage: 'Field',
          })}
          display="columnCompressed"
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.sortFieldSelectPlaceholder', {
              defaultMessage: 'Select sort field',
            })}
            value={this.props.sortField}
            onChange={this._onSortFieldChange}
            fields={this.state.sortFields}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortOrderLabel', {
            defaultMessage: 'Order',
          })}
          display="columnCompressed"
        >
          <EuiSelect
            disabled={!this.props.sortField}
            options={[
              {
                text: i18n.translate('xpack.maps.source.esSearch.ascendingLabel', {
                  defaultMessage: 'ascending',
                }),
                value: SortDirection.asc,
              },
              {
                text: i18n.translate('xpack.maps.source.esSearch.descendingLabel', {
                  defaultMessage: 'descending',
                }),
                value: SortDirection.desc,
              },
            ]}
            value={this.props.sortOrder}
            onChange={this._onSortOrderChange}
            compressed
          />
        </EuiFormRow>
      </EuiPanel>
    );
  }

  _renderScalingPanel() {
    return (
      <EuiPanel>
        <ScalingForm
          filterByMapBounds={this.props.filterByMapBounds}
          indexPatternId={this.props.indexPatternId}
          onChange={this.props.onChange}
          scalingType={this.props.scalingType}
          supportsClustering={this.state.supportsClustering}
          clusteringDisabledReason={this.state.clusteringDisabledReason}
          hasSpatialJoins={this.props.hasSpatialJoins}
          numberOfJoins={this.props.numberOfJoins}
        />
      </EuiPanel>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderTooltipsPanel()}
        <EuiSpacer size="s" />

        {this._renderSortPanel()}
        <EuiSpacer size="s" />

        {this._renderScalingPanel()}
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
