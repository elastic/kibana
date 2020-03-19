/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSpacer, EuiSwitch, EuiCallOut } from '@elastic/eui';

import { SingleFieldSelect } from '../../../components/single_field_select';
import { indexPatternService } from '../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { kfetch } from 'ui/kfetch';
import {
  ES_GEO_FIELD_TYPE,
  GIS_API_PATH,
  DEFAULT_MAX_RESULT_WINDOW,
  SCALING_TYPES,
} from '../../../../common/constants';
import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';
import { indexPatterns } from '../../../../../../../../src/plugins/data/public';
import { ScalingForm } from './scaling_form';
import { getTermsFields } from '../../../index_pattern_util';

import { npStart } from 'ui/new_platform';
const { IndexPatternSelect } = npStart.plugins.data.ui;

function getGeoFields(fields) {
  return fields.filter(field => {
    return (
      !indexPatterns.isNestedField(field) &&
      [ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE].includes(field.type)
    );
  });
}

function isGeoFieldAggregatable(indexPattern, geoFieldName) {
  if (!indexPattern) {
    return false;
  }

  const geoField = indexPattern.fields.getByName(geoFieldName);
  return geoField && geoField.aggregatable;
}

const RESET_INDEX_PATTERN_STATE = {
  indexPattern: undefined,
  geoFieldName: undefined,
  showFilterByBoundsSwitch: false,
  showScalingPanel: false,
  geoFields: undefined,

  // ES search source descriptor state
  filterByMapBounds: DEFAULT_FILTER_BY_MAP_BOUNDS,
  scalingType: SCALING_TYPES.CLUSTERS, // turn on clusting by default
  topHitsSplitField: undefined,
  topHitsSize: 1,
};

export class CreateSourceEditor extends Component {
  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    noGeoIndexPatternsExist: false,
    ...RESET_INDEX_PATTERN_STATE,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _onIndexPatternSelect = indexPatternId => {
    this.setState(
      {
        indexPatternId,
      },
      this._loadIndexPattern(indexPatternId)
    );
  };

  _loadIndexPattern = indexPatternId => {
    this.setState(
      {
        isLoadingIndexPattern: true,
        ...RESET_INDEX_PATTERN_STATE,
      },
      this._debouncedLoad.bind(null, indexPatternId)
    );
  };

  _loadIndexDocCount = async indexPatternTitle => {
    const { count } = await kfetch({
      pathname: `../${GIS_API_PATH}/indexCount`,
      query: {
        index: indexPatternTitle,
      },
    });
    return count;
  };

  _debouncedLoad = _.debounce(async indexPatternId => {
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

    let indexHasSmallDocCount = false;
    try {
      const indexDocCount = await this._loadIndexDocCount(indexPattern.title);
      indexHasSmallDocCount = indexDocCount <= DEFAULT_MAX_RESULT_WINDOW;
    } catch (error) {
      // retrieving index count is a nice to have and is not essential
      // do not interrupt user flow if unable to retrieve count
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== indexPatternId) {
      return;
    }

    const geoFields = getGeoFields(indexPattern.fields);
    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern,
      filterByMapBounds: !indexHasSmallDocCount, // Turn off filterByMapBounds when index contains a limited number of documents
      showFilterByBoundsSwitch: indexHasSmallDocCount,
      showScalingPanel: !indexHasSmallDocCount,
      geoFields,
    });

    // make default selection
    if (geoFields[0]) {
      this._onGeoFieldSelect(geoFields[0].name);
    }
  }, 300);

  _onGeoFieldSelect = geoFieldName => {
    // Respect previous scaling type selection unless newly selected geo field does not support clustering.
    const scalingType =
      this.state.scalingType === SCALING_TYPES.CLUSTERS &&
      !isGeoFieldAggregatable(this.state.indexPattern, geoFieldName)
        ? SCALING_TYPES.LIMIT
        : this.state.scalingType;
    this.setState(
      {
        geoFieldName,
        scalingType,
      },
      this._previewLayer
    );
  };

  _onFilterByMapBoundsChange = event => {
    this.setState(
      {
        filterByMapBounds: event.target.checked,
      },
      this._previewLayer
    );
  };

  _onScalingPropChange = ({ propName, value }) => {
    this.setState(
      {
        [propName]: value,
      },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const {
      indexPatternId,
      geoFieldName,
      filterByMapBounds,
      scalingType,
      topHitsSplitField,
      topHitsSize,
    } = this.state;

    const sourceConfig =
      indexPatternId && geoFieldName
        ? {
            indexPatternId,
            geoField: geoFieldName,
            filterByMapBounds,
            scalingType,
            topHitsSplitField,
            topHitsSize,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esSearch.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esSearch.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoFieldName}
          onChange={this._onGeoFieldSelect}
          fields={this.state.geoFields}
        />
      </EuiFormRow>
    );
  }

  _renderFilterByMapBounds() {
    if (!this.state.showFilterByBoundsSwitch) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.maps.source.esSearch.disableFilterByMapBoundsTitle', {
            defaultMessage: `Dynamic data filter disabled`,
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.maps.source.esSearch.disableFilterByMapBoundsExplainMsg"
              defaultMessage="Index '{indexPatternTitle}' has a small number of documents and does not require dynamic filtering."
              values={{
                indexPatternTitle: this.state.indexPattern
                  ? this.state.indexPattern.title
                  : this.state.indexPatternId,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.source.esSearch.disableFilterByMapBoundsTurnOnMsg"
              defaultMessage="Turn on dynamic filtering if you expect the number of documents to increase."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="s" />
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
              defaultMessage: `Dynamically filter for data in the visible map area`,
            })}
            checked={this.state.filterByMapBounds}
            onChange={this._onFilterByMapBoundsChange}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  _renderScalingPanel() {
    if (!this.state.indexPattern || !this.state.geoFieldName || !this.state.showScalingPanel) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <ScalingForm
          filterByMapBounds={this.state.filterByMapBounds}
          indexPatternId={this.state.indexPatternId}
          onChange={this._onScalingPropChange}
          scalingType={this.state.scalingType}
          supportsClustering={isGeoFieldAggregatable(
            this.state.indexPattern,
            this.state.geoFieldName
          )}
          termFields={getTermsFields(this.state.indexPattern.fields)}
          topHitsSplitField={this.state.topHitsSplitField}
          topHitsSize={this.state.topHitsSize}
        />
      </Fragment>
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

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
            defaultMessage: 'Index pattern',
          })}
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.state.indexPatternId}
            onChange={this._onIndexPatternSelect}
            placeholder={i18n.translate(
              'xpack.maps.source.esSearch.selectIndexPatternPlaceholder',
              {
                defaultMessage: 'Select index pattern',
              }
            )}
            fieldTypes={[ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE]}
            onNoIndexPatterns={this._onNoIndexPatterns}
          />
        </EuiFormRow>

        {this._renderGeoSelect()}

        {this._renderScalingPanel()}

        {this._renderFilterByMapBounds()}
      </Fragment>
    );
  }
}
