/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiLink,
  EuiPagination,
  EuiSelect,
  EuiIconTip,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FeatureProperties } from './feature_properties';
import { FormattedMessage } from '@kbn/i18n/react';
import { GEO_JSON_TYPE, ES_GEO_FIELD_TYPE } from '../../../common/constants';
import { FeatureGeometryFilterForm } from './feature_geometry_filter_form';

const ALL_LAYERS = '_ALL_LAYERS_';
const DEFAULT_PAGE_NUMBER = 0;

const VIEWS = {
  PROPERTIES_VIEW: 'PROPERTIES_VIEW',
  GEOMETRY_FILTER_VIEW: 'GEOMETRY_FILTER_VIEW'
};

export class FeatureTooltip extends React.Component {

  state = {
    uniqueLayers: [],
    pageNumber: DEFAULT_PAGE_NUMBER,
    layerIdFilter: ALL_LAYERS,
    view: VIEWS.PROPERTIES_VIEW,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!_.isEqual(nextProps.anchorLocation, prevState.prevAnchorLocation)) {
      return {
        view: VIEWS.PROPERTIES_VIEW, // reset to properties view when tooltip changes location
        prevAnchorLocation: nextProps.anchorLocation
      };
    }

    return null;
  }

  constructor() {
    super();
    this._prevFeatures = null;
  }


  componentDidMount() {
    this._isMounted = true;
  }

  componentDidUpdate() {
    this._loadUniqueLayers();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onLayerChange = (e) => {
    const layerId = e.target.value;
    if (this.state.layerIdFilter === layerId) {
      return;
    }

    this.setState({
      pageNumber: DEFAULT_PAGE_NUMBER,
      layerIdFilter: layerId
    });
  };

  _onCloseTooltip = () => {
    this.setState({
      layerIdFilter: ALL_LAYERS,
      pageNumber: DEFAULT_PAGE_NUMBER
    }, () => {
      this.props.closeTooltip();
    });
  };

  _loadUniqueLayers = async () => {
    if (this._prevFeatures === this.props.features) {
      return;
    }

    this._prevFeatures = this.props.features;

    const countByLayerId = new Map();
    for (let i = 0; i < this.props.features.length; i++) {
      let count = countByLayerId.get(this.props.features[i].layerId);
      if (!count) {
        count = 0;
      }
      count++;
      countByLayerId.set(this.props.features[i].layerId, count);
    }

    const layers = [];
    countByLayerId.forEach((count, layerId) => {
      layers.push(this.props.findLayerById(layerId));
    });

    const layerNamePromises = layers.map(layer => {
      return layer.getDisplayName();
    });

    const layerNames = await Promise.all(layerNamePromises);
    const options = layers.map((layer, index) => {
      return {
        displayName: layerNames[index],
        id: layer.getId(),
        count: countByLayerId.get(layer.getId())
      };
    });

    if (this._isMounted) {
      this.setState({
        uniqueLayers: options,
        layerIdFilter: ALL_LAYERS,
        pageNumber: DEFAULT_PAGE_NUMBER
      });
    }
  };

  _showGeometryFilterView = () => {
    this.setState({ view: VIEWS.GEOMETRY_FILTER_VIEW });
  }

  _showPropertiesView = () => {
    this.setState({ view: VIEWS.PROPERTIES_VIEW });
  }

  _renderProperties(feature) {
    if (!feature) {
      return null;
    }
    return (
      <FeatureProperties
        featureId={feature.id}
        layerId={feature.layerId}
        loadFeatureProperties={this.props.loadFeatureProperties}
        showFilterButtons={this.props.showFilterButtons}
        onCloseTooltip={this._onCloseTooltip}
        addFilters={this.props.addFilters}
        reevaluateTooltipPosition={this.props.reevaluateTooltipPosition}
      />
    );
  }

  _renderActions(geoFields) {
    if (!this.props.isLocked || geoFields.length === 0) {
      return null;
    }

    return (
      <EuiLink
        className="mapFeatureTooltip_actionLinks"
        onClick={this._showGeometryFilterView}
      >
        <FormattedMessage
          id="xpack.maps.tooltip.showGeometryFilterViewLinkLabel"
          defaultMessage="Filter by geometry"
        />
      </EuiLink>
    );
  }

  _renderLayerFilterBox() {
    if (!this.state.uniqueLayers || this.state.uniqueLayers.length < 2) {
      return null;
    }
    const layerOptions = this.state.uniqueLayers.map(({ id, displayName, count }) => {
      return {
        value: id,
        text: `(${count}) ${displayName}`
      };
    });

    const options = [
      {
        value: ALL_LAYERS,
        text: i18n.translate('xpack.maps.tooltip.allLayersLabel', {
          defaultMessage: 'All layers'
        })
      },
      ...layerOptions
    ];

    return (
      <EuiSelect
        options={options}
        onChange={this._onLayerChange}
        value={this.state.layerIdFilter}
        compressed
        fullWidth
        aria-label={i18n.translate('xpack.maps.tooltip.layerFilterLabel', {
          defaultMessage: 'Filter results by layer'
        })}
      />
    );
  }

  _renderHeader() {
    if (!this.props.isLocked) {
      return null;
    }

    const divider = (this.state.uniqueLayers && this.state.uniqueLayers.length > 1) ?
      <EuiHorizontalRule margin="xs"/> : null;
    return (
      <Fragment>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            {this._renderLayerFilterBox()}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              onClick={this._onCloseTooltip}
              iconType="cross"
              aria-label={i18n.translate('xpack.maps.tooltip.closeAriaLabel', {
                defaultMessage: 'Close tooltip'
              })}
              data-test-subj="mapTooltipCloseButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {divider}
      </Fragment>
    );
  }

  _renderFooter(filteredFeatures) {
    if (filteredFeatures.length === 1) {
      return null;
    }

    return (
      <Fragment>
        <EuiHorizontalRule margin="xs"/>
        {this._renderPagination(filteredFeatures)}
      </Fragment>
    );
  }

  _onPageChange = (pageNumber) => {
    this.setState({
      pageNumber: pageNumber,
    });
  };

  _filterFeatures() {
    if (this.state.layerIdFilter === ALL_LAYERS) {
      return this.props.features;
    }

    return this.props.features.filter((feature) => {
      return feature.layerId === this.state.layerIdFilter;
    });
  }

  _filterGeoFields(featureGeometry) {
    if (!featureGeometry) {
      return [];
    }

    // line geometry can only create filters for geo_shape fields.
    if (featureGeometry.type === GEO_JSON_TYPE.LINE_STRING
      || featureGeometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING) {
      return this.props.geoFields.filter(({ geoFieldType }) => {
        return geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE;
      });
    }

    // TODO support geo distance filters for points
    if (featureGeometry.type === GEO_JSON_TYPE.POINT
      || featureGeometry.type === GEO_JSON_TYPE.MULTI_POINT) {
      return [];
    }

    return this.props.geoFields;
  }

  _renderPagination(filteredFeatures) {
    const pageNumberReadout = (
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="xpack.maps.tooltip.pageNumerText"
          defaultMessage="{pageNumber} of {total} features"
          values={{
            pageNumber: this.state.pageNumber + 1,
            total: filteredFeatures.length
          }}
        />
      </EuiTextColor>
    );

    const cycleArrows = (this.props.isLocked) ? (<EuiPagination
      pageCount={filteredFeatures.length}
      activePage={this.state.pageNumber}
      onPageClick={this._onPageChange}
      compressed
    />) : null;

    const hint = (this.props.isLocked && filteredFeatures.length > 20) ? (
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="iInCircle"
          content={i18n.translate('xpack.maps.tooltip.infoIconHelp', {
            defaultMessage: 'Use query bar and time picker to limit the features displayed for each layer.'
          })}
        />
      </EuiFlexItem>
    ) : null;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
          {hint}
          <EuiFlexItem>
            {pageNumberReadout}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {cycleArrows}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  render() {
    const filteredFeatures = this._filterFeatures();
    const currentFeature = filteredFeatures[this.state.pageNumber];
    const currentFeatureGeometry = this.props.loadFeatureGeometry({
      layerId: currentFeature.layerId,
      featureId: currentFeature.id
    });
    const filteredGeoFields = this._filterGeoFields(currentFeatureGeometry);

    if (this.state.view === VIEWS.GEOMETRY_FILTER_VIEW && currentFeatureGeometry) {
      return (
        <FeatureGeometryFilterForm
          onClose={this._onCloseTooltip}
          showPropertiesView={this._showPropertiesView}
          geometry={currentFeatureGeometry}
          geoFields={filteredGeoFields}
          addFilters={this.props.addFilters}
          reevaluateTooltipPosition={this.props.reevaluateTooltipPosition}
        />
      );
    }

    return (
      <Fragment>
        {this._renderHeader()}
        {this._renderProperties(currentFeature)}
        {this._renderActions(filteredGeoFields)}
        {this._renderFooter(filteredFeatures)}
      </Fragment>
    );
  }
}
