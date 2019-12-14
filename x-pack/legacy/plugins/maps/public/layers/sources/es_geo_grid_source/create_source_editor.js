/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import { IndexPatternSelect } from 'ui/index_patterns';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { RENDER_AS } from './render_as';
import { indexPatternService } from '../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiComboBox, EuiSpacer } from '@elastic/eui';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';

function filterGeoField({ type }) {
  return [ES_GEO_FIELD_TYPE.GEO_POINT].includes(type);
}

const requestTypeOptions = [
  {
    label: i18n.translate('xpack.maps.source.esGeoGrid.pointsDropdownOption', {
      defaultMessage: 'points',
    }),
    value: RENDER_AS.POINT,
  },
  {
    label: i18n.translate('xpack.maps.source.esGeoGrid.gridRectangleDropdownOption', {
      defaultMessage: 'grid rectangles',
    }),
    value: RENDER_AS.GRID,
  },
  {
    label: i18n.translate('xpack.maps.source.esGeoGrid.heatmapDropdownOption', {
      defaultMessage: 'heat map',
    }),
    value: RENDER_AS.HEATMAP,
  },
];

export class CreateSourceEditor extends Component {
  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    indexPatternId: '',
    geoField: '',
    requestType: requestTypeOptions[0],
    noGeoIndexPatternsExist: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  onIndexPatternSelect = indexPatternId => {
    this.setState(
      {
        indexPatternId,
      },
      this.loadIndexPattern.bind(null, indexPatternId)
    );
  };

  loadIndexPattern = indexPatternId => {
    this.setState(
      {
        isLoadingIndexPattern: true,
        indexPattern: undefined,
        geoField: undefined,
      },
      this.debouncedLoad.bind(null, indexPatternId)
    );
  };

  debouncedLoad = _.debounce(async indexPatternId => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== indexPatternId) {
      return;
    }

    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern,
    });

    //make default selection
    const geoFields = indexPattern.fields.filter(filterGeoField);
    if (geoFields[0]) {
      this._onGeoFieldSelect(geoFields[0].name);
    }
  }, 300);

  _onGeoFieldSelect = geoField => {
    this.setState(
      {
        geoField,
      },
      this.previewLayer
    );
  };

  _onRequestTypeSelect = selectedOptions => {
    this.setState(
      {
        requestType: selectedOptions[0],
      },
      this.previewLayer
    );
  };

  previewLayer = () => {
    const { indexPatternId, geoField, requestType } = this.state;

    const sourceConfig =
      indexPatternId && geoField
        ? { indexPatternId, geoField, requestType: requestType.value }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoGrid.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esGeoGrid.geofieldPlaceholder', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoField}
          onChange={this._onGeoFieldSelect}
          filterField={filterGeoField}
          fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
        />
      </EuiFormRow>
    );
  }

  _renderLayerSelect() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoGrid.showAsLabel', {
          defaultMessage: 'Show as',
        })}
      >
        <EuiComboBox
          placeholder={i18n.translate('xpack.maps.source.esGeoGrid.showAsPlaceholder', {
            defaultMessage: 'Select a single option',
          })}
          singleSelection={{ asPlainText: true }}
          options={requestTypeOptions}
          selectedOptions={[this.state.requestType]}
          onChange={this._onRequestTypeSelect}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  _renderIndexPatternSelect() {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoGrid.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        })}
      >
        <IndexPatternSelect
          isDisabled={this.state.noGeoIndexPatternsExist}
          indexPatternId={this.state.indexPatternId}
          onChange={this.onIndexPatternSelect}
          placeholder={i18n.translate('xpack.maps.source.esGeoGrid.indexPatternPlaceholder', {
            defaultMessage: 'Select index pattern',
          })}
          fieldTypes={[ES_GEO_FIELD_TYPE.GEO_POINT]}
          onNoIndexPatterns={this._onNoIndexPatterns}
        />
      </EuiFormRow>
    );
  }

  _renderNoIndexPatternWarning() {
    if (!this.state.noGeoIndexPatternsExist) {
      return null;
    }

    return (
      <Fragment>
        <NoIndexPatternCallout />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderNoIndexPatternWarning()}
        {this._renderIndexPatternSelect()}
        {this._renderGeoSelect()}
        {this._renderLayerSelect()}
      </Fragment>
    );
  }
}
