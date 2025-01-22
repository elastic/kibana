/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { WmsClient } from './wms_client';
import _ from 'lodash';

const LAYERS_LABEL = i18n.translate('xpack.maps.source.wms.layersLabel', {
  defaultMessage: 'Layers',
});
const STYLES_LABEL = i18n.translate('xpack.maps.source.wms.stylesLabel', {
  defaultMessage: 'Styles',
});

export class WMSCreateSourceEditor extends Component {
  state = {
    serviceUrl: '',
    layers: '',
    styles: '',
    isLoadingCapabilities: false,
    getCapabilitiesError: null,
    hasAttemptedToLoadCapabilities: false,
    layerOptions: [],
    styleOptions: [],
    selectedLayerOptions: [],
    selectedStyleOptions: [],
  };
  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _previewIfPossible = _.debounce(() => {
    const { serviceUrl, layers, styles } = this.state;

    const sourceConfig =
      serviceUrl && layers
        ? {
            serviceUrl,
            layers,
            styles,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  }, 2000);

  _loadCapabilities = async () => {
    if (!this.state.serviceUrl) {
      return;
    }

    this.setState({
      hasAttemptedToLoadCapabilities: true,
      isLoadingCapabilities: true,
      getCapabilitiesError: null,
    });

    const wmsClient = new WmsClient({ serviceUrl: this.state.serviceUrl });

    let capabilities;
    try {
      capabilities = await wmsClient.getCapabilities();
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isLoadingCapabilities: false,
          getCapabilitiesError: error.message,
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isLoadingCapabilities: false,
      layerOptions: capabilities.layers,
      styleOptions: capabilities.styles,
    });
  };

  _handleServiceUrlChange = (e) => {
    this.setState(
      {
        serviceUrl: e.target.value,
        hasAttemptedToLoadCapabilities: false,
        layerOptions: [],
        styleOptions: [],
        selectedLayerOptions: [],
        selectedStyleOptions: [],
        layers: '',
        styles: '',
      },
      this._previewIfPossible
    );
  };

  _handleLayersChange = (e) => {
    this.setState({ layers: e.target.value }, this._previewIfPossible);
  };

  _handleLayerOptionsChange = (selectedOptions) => {
    this.setState(
      {
        selectedLayerOptions: selectedOptions,
        layers: selectedOptions
          .map((selectedOption) => {
            return selectedOption.value;
          })
          .join(','),
      },
      this._previewIfPossible
    );
  };

  _handleStylesChange = (e) => {
    this.setState({ styles: e.target.value }, this._previewIfPossible);
  };

  _handleStyleOptionsChange = (selectedOptions) => {
    this.setState(
      {
        selectedStyleOptions: selectedOptions,
        styles: selectedOptions
          .map((selectedOption) => {
            return selectedOption.value;
          })
          .join(','),
      },
      this._previewIfPossible
    );
  };

  _renderLayerAndStyleInputs() {
    if (!this.state.hasAttemptedToLoadCapabilities || this.state.isLoadingCapabilities) {
      return null;
    }

    if (this.state.getCapabilitiesError || this.state.layerOptions.length === 0) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut
            title={i18n.translate('xpack.maps.source.wms.getCapabilitiesErrorCalloutTitle', {
              defaultMessage: 'Unable to load service metadata',
            })}
            color="warning"
          >
            <p>{this.state.getCapabilitiesError}</p>
          </EuiCallOut>
          <EuiSpacer />

          <EuiFormRow
            label={LAYERS_LABEL}
            helpText={i18n.translate('xpack.maps.source.wms.layersHelpText', {
              defaultMessage: 'Use comma separated list of layer names',
            })}
          >
            <EuiFieldText onChange={this._handleLayersChange} />
          </EuiFormRow>

          <EuiFormRow
            label={STYLES_LABEL}
            helpText={i18n.translate('xpack.maps.source.wms.stylesHelpText', {
              defaultMessage: 'Use comma separated list of style names',
            })}
          >
            <EuiFieldText onChange={this._handleStylesChange} />
          </EuiFormRow>
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiFormRow label={LAYERS_LABEL}>
          <EuiComboBox
            options={this.state.layerOptions}
            selectedOptions={this.state.selectedLayerOptions}
            onChange={this._handleLayerOptionsChange}
          />
        </EuiFormRow>
        <EuiFormRow label={STYLES_LABEL}>
          <EuiComboBox
            options={this.state.styleOptions}
            selectedOptions={this.state.selectedStyleOptions}
            onChange={this._handleStyleOptionsChange}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  _renderGetCapabilitiesButton() {
    if (!this.state.isLoadingCapabilities && this.state.hasAttemptedToLoadCapabilities) {
      return null;
    }

    return (
      <Fragment>
        <EuiButton
          onClick={this._loadCapabilities}
          isDisabled={!this.state.serviceUrl}
          isLoading={this.state.isLoadingCapabilities}
        >
          <FormattedMessage
            id="xpack.maps.source.wms.getCapabilitiesButtonText"
            defaultMessage="Load capabilities"
          />
        </EuiButton>
      </Fragment>
    );
  }

  render() {
    return (
      <EuiPanel>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.wms.urlLabel', {
            defaultMessage: 'Url',
          })}
        >
          <EuiFieldText value={this.state.serviceUrl} onChange={this._handleServiceUrlChange} />
        </EuiFormRow>

        {this._renderGetCapabilitiesButton()}

        {this._renderLayerAndStyleInputs()}
      </EuiPanel>
    );
  }
}
