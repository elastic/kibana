/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import type { InspectorViewProps } from '@kbn/inspector-plugin/public';
import { XJsonLang } from '@kbn/monaco';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { EmptyPrompt } from './empty_prompt';
import type { TileRequest } from '../types';
import { TileRequestTab } from './tile_request_tab';
import { RequestsViewCallout } from './requests_view_callout';

const REQUEST_VIEW_ID = 'request_view';
export const RESPONSE_VIEW_ID = 'response_view';

interface Options {
  initialLayerId?: string;
  initialTileKey?: string;
  initialTab?: typeof REQUEST_VIEW_ID | typeof RESPONSE_VIEW_ID;
}

interface State {
  selectedLayer: EuiComboBoxOptionOption<string> | null;
  selectedTileRequest: TileRequest | null;
  selectedView: typeof REQUEST_VIEW_ID | typeof RESPONSE_VIEW_ID;
  tileRequests: TileRequest[];
  layerOptions: Array<EuiComboBoxOptionOption<string>>;
}

export class VectorTileInspector extends Component<InspectorViewProps, State> {
  private _isMounted = false;

  constructor(props: InspectorViewProps) {
    super(props);
    this.state = {
      selectedLayer: null,
      selectedTileRequest: null,
      selectedView:
        props.options && (props.options as Options).initialTab
          ? (props.options as Options).initialTab!
          : REQUEST_VIEW_ID,
      tileRequests: [],
      layerOptions: [],
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this._onAdapterChange();
    this.props.adapters.vectorTiles.on('change', this._debouncedOnAdapterChange);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.adapters.vectorTiles.removeListener('change', this._debouncedOnAdapterChange);
  }

  _getDefaultLayer(layerOptions: Array<EuiComboBoxOptionOption<string>>) {
    if (
      this.state.selectedLayer &&
      layerOptions.some((layerOption) => {
        return this.state.selectedLayer?.value === layerOption.value;
      })
    ) {
      return this.state.selectedLayer;
    }

    if (this.props.options && (this.props.options as Options).initialLayerId) {
      const initialLayer = layerOptions.find((layerOption) => {
        return (this.props.options as Options).initialLayerId === layerOption.value;
      });
      if (initialLayer) {
        return initialLayer;
      }
    }

    return layerOptions[0];
  }

  _getDefaultTileRequest(tileRequests: TileRequest[]) {
    if (
      this.state.selectedTileRequest &&
      tileRequests.some((tileRequest: TileRequest) => {
        return (
          this.state.selectedTileRequest?.layerId === tileRequest.layerId &&
          this.state.selectedTileRequest?.x === tileRequest.x &&
          this.state.selectedTileRequest?.y === tileRequest.y &&
          this.state.selectedTileRequest?.z === tileRequest.z
        );
      })
    ) {
      return this.state.selectedTileRequest;
    }

    if (tileRequests.length === 0) {
      return null;
    }

    if (this.props.options && (this.props.options as Options).initialTileKey) {
      const initialTileRequest = tileRequests.find((tileRequest) => {
        return (
          (this.props.options as Options).initialTileKey ===
          `${tileRequest.z}/${tileRequest.x}/${tileRequest.y}`
        );
      });
      if (initialTileRequest) {
        return initialTileRequest;
      }
    }

    return tileRequests[0];
  }

  _onAdapterChange = () => {
    const layerOptions = this.props.adapters.vectorTiles.getLayerOptions() as Array<
      EuiComboBoxOptionOption<string>
    >;
    if (layerOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        selectedTileRequest: null,
        tileRequests: [],
        layerOptions: [],
      });
      return;
    }

    const selectedLayer = this._getDefaultLayer(layerOptions);
    const tileRequests = this.props.adapters.vectorTiles.getTileRequests(selectedLayer.value);
    this.setState({
      selectedLayer,
      selectedTileRequest: this._getDefaultTileRequest(tileRequests),
      tileRequests,
      layerOptions,
    });
  };

  _debouncedOnAdapterChange = _.debounce(() => {
    if (this._isMounted) {
      this._onAdapterChange();
    }
  }, 256);

  _onLayerSelect = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        selectedTileRequest: null,
        tileRequests: [],
      });
      return;
    }

    const selectedLayer = selectedOptions[0];
    const tileRequests = this.props.adapters.vectorTiles.getTileRequests(selectedLayer.value);
    this.setState({
      selectedLayer,
      selectedTileRequest: tileRequests.length ? tileRequests[0] : null,
      tileRequests,
    });
  };

  _onTileSelect = (selectedOptions: Array<EuiComboBoxOptionOption<TileRequest>>) => {
    if (selectedOptions.length === 0) {
      this.setState({ selectedTileRequest: null });
      return;
    }

    this.setState({
      selectedTileRequest: selectedOptions[0].value ? selectedOptions[0].value : null,
    });
  };

  _renderTileRequest() {
    if (!this.state.selectedTileRequest) {
      return null;
    }

    if (this.state.selectedView === REQUEST_VIEW_ID) {
      return (
        <TileRequestTab
          key={`${this.state.selectedTileRequest.layerId}${this.state.selectedTileRequest.x}${this.state.selectedTileRequest.y}${this.state.selectedTileRequest.z}`}
          tileRequest={this.state.selectedTileRequest}
        />
      );
    }

    const tileResponse = getTileResponse(this.state.selectedTileRequest);

    return tileResponse ? (
      <CodeEditor
        languageId={XJsonLang.ID}
        value={JSON.stringify(tileResponse, null, 2)}
        options={{
          readOnly: true,
          lineNumbers: 'off',
          fontSize: 12,
          minimap: {
            enabled: false,
          },
          folding: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
      />
    ) : (
      <EuiText>
        <p>
          {i18n.translate('xpack.maps.inspector.vectorTile.tileMetaFeatureNotAvailable', {
            defaultMessage: 'Not available',
          })}
        </p>
      </EuiText>
    );
  }

  render() {
    return this.state.layerOptions.length === 0 ? (
      <>
        <RequestsViewCallout />
        <EmptyPrompt />
      </>
    ) : (
      <>
        <RequestsViewCallout />

        <EuiSpacer />

        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.maps.inspector.vectorTile.layerSelectLabel', {
            defaultMessage: 'Layer',
          })}
        >
          <EuiComboBox
            fullWidth
            singleSelection={true}
            options={this.state.layerOptions}
            selectedOptions={this.state.selectedLayer ? [this.state.selectedLayer] : []}
            onChange={this._onLayerSelect}
            isClearable={false}
          />
        </EuiFormRow>

        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.maps.inspector.vectorTile.tileSelectLabel', {
            defaultMessage: 'Tile',
          })}
        >
          <EuiComboBox
            fullWidth
            singleSelection={true}
            options={this.state.tileRequests.map((tileRequest) => {
              return {
                label: `${tileRequest.z}/${tileRequest.x}/${tileRequest.y}`,
                value: tileRequest,
              };
            })}
            selectedOptions={
              this.state.selectedTileRequest
                ? [
                    {
                      label: `${this.state.selectedTileRequest.z}/${this.state.selectedTileRequest.x}/${this.state.selectedTileRequest.y}`,
                      value: this.state.selectedTileRequest,
                    },
                  ]
                : []
            }
            onChange={this._onTileSelect}
            isClearable={false}
          />
        </EuiFormRow>

        <EuiTabs size="s">
          <>
            <EuiTab
              onClick={() => {
                this.setState({ selectedView: REQUEST_VIEW_ID });
              }}
              isSelected={this.state.selectedView === REQUEST_VIEW_ID}
            >
              {i18n.translate('xpack.maps.inspector.vectorTile.requestTabLabel', {
                defaultMessage: 'Request',
              })}
            </EuiTab>
            <EuiTab
              onClick={() => {
                this.setState({ selectedView: RESPONSE_VIEW_ID });
              }}
              isSelected={this.state.selectedView === RESPONSE_VIEW_ID}
            >
              {i18n.translate('xpack.maps.inspector.vectorTile.responseTabLabel', {
                defaultMessage: 'Response',
              })}
            </EuiTab>
          </>
        </EuiTabs>
        <EuiSpacer size="s" />
        {this._renderTileRequest()}
      </>
    );
  }
}

function getTileResponse(tileRequest: TileRequest) {
  if (tileRequest.tileError) {
    return {
      error: tileRequest.tileError.error
        ? tileRequest.tileError.error
        : tileRequest.tileError.message,
    };
  }

  return tileRequest.tileMetaFeature
    ? {
        meta: tileRequest.tileMetaFeature.properties,
      }
    : undefined;
}
