/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiText,
  EuiTextAlign,
  EuiPagination,
  EuiSuperSelect
} from '@elastic/eui';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';


const ALL_LAYERS = '_ALL_LAYERS_';
const DEFAULT_PAGE_NUMBER = 0;

export class FeatureTooltip extends React.Component {

  state = {
    uniqueLayers: [],
    properties: null,
    loadPropertiesErrorMsg: null,
    pageNumber: DEFAULT_PAGE_NUMBER,
    layerIdFilter: ALL_LAYERS
  };

  componentDidMount() {
    this._isMounted = true;
    this.prevLayerId = undefined;
    this.prevFeatureId = undefined;
    this._loadProperties();
  }

  componentDidUpdate() {
    this._loadProperties();
    this._loadUniqueLayers();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onLayerChange = (layerId) => {

    if (this.state.layerIdFilter === layerId) {
      return;
    }

    this.setState({
      properties: null,
      pageNumber: DEFAULT_PAGE_NUMBER,
      layerIdFilter: layerId
    }, () => {
      this.prevLayerId = null;
      this.prevFeatureId = null;
      this._loadProperties();
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

    const uniqueLayerIds = [];
    for (let i = 0; i < this.props.tooltipState.features.length; i++) {
      if (uniqueLayerIds.indexOf(this.props.tooltipState.features[i].layerId) < 0) {
        uniqueLayerIds.push(this.props.tooltipState.features[i].layerId);
      }
    }

    const layers = uniqueLayerIds.map(layerId => {
      return this.props.findLayerById(layerId);
    });

    const layerNamePromises = layers.map(layer => {
      return layer.getDisplayName();
    });

    const layerNames = await Promise.all(layerNamePromises);


    const options = layers.map((layer, index) => {
      return {
        displayName: layerNames[index],
        id: layer.getId()
      };
    });

    if (this._isMounted) {
      if (!_.isEqual(this.state.uniqueLayers, options)) {
        this.setState({
          uniqueLayers: options,
          layerIdFilter: ALL_LAYERS,
          pageNumber: DEFAULT_PAGE_NUMBER
        });
      }
    }
  };

  _loadProperties = () => {
    const features = this._filterFeatures();
    const feature = features[this.state.pageNumber];

    if (!feature) {
      return;
    }

    this._fetchProperties({
      nextFeatureId: feature.id,
      nextLayerId: feature.layerId
    });
  };

  _fetchProperties = async ({ nextLayerId, nextFeatureId }) => {
    if (this.prevLayerId === nextLayerId && this.prevFeatureId === nextFeatureId) {
      // do not reload same feature properties
      return;
    }

    this.prevLayerId = nextLayerId;
    this.prevFeatureId = nextFeatureId;
    this.setState({
      properties: undefined,
      loadPropertiesErrorMsg: undefined,
    });

    let properties;
    try {
      properties = await this.props.loadFeatureProperties({ layerId: nextLayerId, featureId: nextFeatureId });
    } catch(error) {
      if (this._isMounted) {
        this.setState({
          properties: [],
          loadPropertiesErrorMsg: error.message
        });
      }
      return;
    }

    if (this.prevLayerId !== nextLayerId && this.prevFeatureId !== nextFeatureId) {
      // ignore results for old request
      return;
    }

    if (this._isMounted) {
      this.setState({
        properties
      });
    }
  };

  _renderFilterCell(tooltipProperty) {
    if (!this.props.showFilterButtons || !tooltipProperty.isFilterable())  {
      return null;
    }

    return (
      <td>
        <EuiButtonIcon
          className="mapFeatureTooltip__filterButton"
          iconType="plusInCircle"
          title={i18n.translate('xpack.maps.tooltip.filterOnPropertyTitle', {
            defaultMessage: 'Filter on property'
          })}
          onClick={() => {
            this._onCloseTooltip();
            const filterAction = tooltipProperty.getFilterAction();
            filterAction();
          }}
          aria-label={i18n.translate('xpack.maps.tooltip.filterOnPropertyAriaLabel', {
            defaultMessage: 'Filter on property'
          })}
          data-test-subj="mapTooltipCreateFilterButton"
        />
      </td>
    );
  }

  _renderProperties() {

    if (this.state.loadPropertiesErrorMsg) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.tooltip.unableToLoadContentTitle', {
            defaultMessage: 'Unable to load tooltip content'
          })}
          color="danger"
          iconType="alert"
          size="s"
        >
          <p>
            {this.state.loadPropertiesErrorMsg}
          </p>
        </EuiCallOut>
      );
    }

    if (!this.state.properties) {
      const loadingMsg = i18n.translate('xpack.maps.tooltip.loadingMsg', {
        defaultMessage: 'Loading'
      });
      return (
        <EuiTextAlign textAlign="center">
          <EuiLoadingSpinner size="m" />
          {loadingMsg}
        </EuiTextAlign>
      );
    }

    const rows = this.state.properties.map(tooltipProperty => {
      const label = tooltipProperty.getPropertyName();
      return (
        <tr key={label}>
          <td className="eui-textOverflowWrap mapFeatureTooltip__propertyLabel">
            {label}
          </td>
          <td
            className="eui-textOverflowWrap mapFeatureTooltip__propertyValue"
            /*
             * Justification for dangerouslySetInnerHTML:
             * Property value contains value generated by Field formatter
             * Since these formatters produce raw HTML, this component needs to be able to render them as-is, relying
             * on the field formatter to only produce safe HTML.
             */
            dangerouslySetInnerHTML={{ __html: tooltipProperty.getHtmlDisplayValue() }} //eslint-disable-line react/no-danger
          />
          {this._renderFilterCell(tooltipProperty)}
        </tr>
      );
    });

    return (
      <table className="mapFeatureTooltip_table">
        <tbody>
          {rows}
        </tbody>
      </table>
    );
  }

  _renderLayerFilterBox() {

    if (!this.props.showFeatureList) {
      return null;
    }

    if (!this.state.uniqueLayers || this.state.uniqueLayers.length < 2) {
      return null;
    }

    const layerOptions = this.state.uniqueLayers.map(({ id, displayName })=> {
      return {
        value: id,
        inputDisplay: (<EuiText>{displayName}</EuiText>)
      };
    });

    const options = [
      {
        value: ALL_LAYERS,
        inputDisplay: (<EuiText>All layers</EuiText>)
      },
      ...layerOptions
    ];

    return (
      <EuiSuperSelect
        options={options}
        onChange={this._onLayerChange}
        valueOfSelected={this.state.layerIdFilter}
      />
    );

  }

  _renderCloseButton() {
    if (!this.props.showCloseButton) {
      return null;
    }
    return (
      <EuiTextAlign textAlign="center">
        <EuiButtonIcon
          onClick={this._onCloseTooltip}
          iconType="cross"
          aria-label={i18n.translate('xpack.maps.tooltip.closeAriaLabel', {
            defaultMessage: 'Close tooltip'
          })}
          data-test-subj="mapTooltipCloseButton"
        />
      </EuiTextAlign>
    );
  }

  _onPageChange = (pageNumber) => {
    this.prevLayerId = null;
    this.prevFeatureId = null;
    this.setState({
      pageNumber: pageNumber,
      properties: null
    }, () => {
      this._loadProperties();
    });
  };

  _filterFeatures() {
    if (this.state.layerIdFilter === ALL_LAYERS) {
      return this.props.tooltipState.features;
    }

    return this.props.tooltipState.features.filter((feature) => {
      return feature.layerId === this.state.layerIdFilter;
    });
  }

  _renderPagination(filteredFeatures) {

    if (filteredFeatures.length === 1) {
      return null;
    }

    if (!this.props.showFeatureList) {
      return (
        <EuiTextAlign textAlign="center">
          <EuiText>1 of {filteredFeatures.length}</EuiText>
        </EuiTextAlign>
      );
    }

    return (
      <EuiPagination
        pageCount={filteredFeatures.length}
        activePage={this.state.pageNumber}
        onPageClick={this._onPageChange}
      />
    );
  }

  render() {

    const filteredFeatures = this._filterFeatures();

    return (
      <Fragment>
        {this._renderCloseButton()}
        {this._renderProperties(filteredFeatures)}
        {this._renderPagination(filteredFeatures)}
        {this._renderLayerFilterBox()}
      </Fragment>
    );
  }
}

