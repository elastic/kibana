/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiPagination,
  EuiSelect,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const ALL_LAYERS = '_ALL_LAYERS_';
const DEFAULT_PAGE_NUMBER = 0;

export class TooltipHeader extends Component {

  state = {
    filteredFeatures: this.props.features,
    pageNumber: DEFAULT_PAGE_NUMBER,
    selectedLayerId: ALL_LAYERS,
  };

  constructor(props) {
    super(props);
    this._prevFeatures = null;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadUniqueLayers();
  }

  componentDidUpdate() {
    this._loadUniqueLayers();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

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

    if (this._isMounted) {
      this.setState({
        filteredFeatures: this.props.features,
        selectedLayerId: ALL_LAYERS,
        layers: layers.map((layer, index) => {
          return {
            displayName: layerNames[index],
            id: layer.getId(),
            count: countByLayerId.get(layer.getId())
          };
        })
      },
      () => {this._onPageChange(DEFAULT_PAGE_NUMBER)});
    }
  };

  _onPageChange = pageNumber => {
    this.setState({ pageNumber });
    this.props.setCurrentFeature(this.state.filteredFeatures[pageNumber]);
  };

  _onLayerChange = e => {
    const newLayerId = e.target.value;
    if (this.state.selectedLayerId === newLayerId) {
      return;
    }

    const filteredFeatures = newLayerId === ALL_LAYERS
      ? this.props.features
      : this.props.features.filter((feature) => {
        return feature.layerId === newLayerId;
      });

    this.setState({
      filteredFeatures,
      selectedLayerId: newLayerId
    },
    () => {this._onPageChange(DEFAULT_PAGE_NUMBER)});
  };

  render() {
    const { isLocked } = this.props;
    const { filteredFeatures, pageNumber, selectedLayerId, layers } = this.state;

    const headerItems = [];

    // Pagination controls
    if (isLocked && filteredFeatures.length > 1) {
      headerItems.push(
        <EuiFlexItem grow={false} key="pagination">
          <EuiPagination
            pageCount={filteredFeatures.length}
            activePage={pageNumber}
            onPageClick={this._onPageChange}
            compressed
          />
        </EuiFlexItem>
      );
    }

    // Page number readout
    if (filteredFeatures.length > 1) {
      headerItems.push(
        <EuiFlexItem grow={false} key="pageNumber">
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.maps.tooltip.pageNumerText"
              defaultMessage="{pageNumber} of {total}"
              values={{
                pageNumber: pageNumber + 1,
                total: filteredFeatures.length
              }}
            />
          </EuiTextColor>
        </EuiFlexItem>
      );
    }

    // Layer select
    if (isLocked && layers && layers.length > 1) {
      const options = [
        {
          value: ALL_LAYERS,
          text: i18n.translate('xpack.maps.tooltip.allLayersLabel', {
            defaultMessage: 'All layers'
          })
        },
        ...layers.map(({ id, displayName, count }) => {
          return {
            value: id,
            text: `(${count}) ${displayName}`
          };
        })
      ];
      headerItems.push(
        <EuiFlexItem key="layerSelect">
          <EuiFormRow display="rowCompressed">
            <EuiSelect
              options={options}
              onChange={this._onLayerChange}
              value={selectedLayerId}
              compressed
              fullWidth
              aria-label={i18n.translate('xpack.maps.tooltip.layerFilterLabel', {
                defaultMessage: 'Filter results by layer'
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }

    // Close button
    if (isLocked) {
      // When close button is the only item, add empty FlexItem to push close button to right
      if (headerItems.length === 0) {
        headerItems.push(<EuiFlexItem key="spacer"></EuiFlexItem>);
      }

      headerItems.push(
        <EuiFlexItem grow={false} key="closeButton">
          <EuiButtonIcon
            onClick={this.props.onClose}
            iconType="cross"
            aria-label={i18n.translate('xpack.maps.tooltip.closeAriaLabel', {
              defaultMessage: 'Close tooltip'
            })}
            data-test-subj="mapTooltipCloseButton"
          />
        </EuiFlexItem>
      );
    }

    if (headerItems.length === 0) {
      return null;
    }

    return (
      <Fragment>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {headerItems}
        </EuiFlexGroup>

        <EuiHorizontalRule margin="xs"/>
      </Fragment>
    );
  }
}
