/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiIcon,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { FilterEditor } from './filter_editor';
import { JoinEditor, JoinField } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { LayerSettings } from './layer_settings';
import { StyleSettings } from './style_settings';
import { StyleDescriptor, VectorLayerDescriptor } from '../../../common/descriptor_types';
import { getData, getCore } from '../../kibana_services';
import { ILayer } from '../../classes/layers/layer';
import { isVectorLayer } from '../../classes/layers/vector_layer';
import { OnSourceChangeArgs } from '../../classes/sources/source';
import { isESSource } from '../../classes/sources/es_source';
import { IField } from '../../classes/fields/field';
import { isLayerGroup } from '../../classes/layers/layer_group';
import { isSpatialJoin } from '../../classes/joins/is_spatial_join';
import { SourceDetails } from './source_details';

const localStorage = new Storage(window.localStorage);

export interface Props {
  selectedLayer?: ILayer;
  updateSourceProps: (layerId: string, sourcePropChanges: OnSourceChangeArgs[]) => Promise<void>;
  updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => void;
}

interface State {
  displayName: string;
  leftJoinFields: JoinField[];
  supportsFitToBounds: boolean;
}

export class EditLayerPanel extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    displayName: '',
    leftJoinFields: [],
    supportsFitToBounds: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadDisplayName();
    this._loadLeftJoinFields();
    this._loadSupportsFitToBounds();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadSupportsFitToBounds = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const supportsFitToBounds = await this.props.selectedLayer.supportsFitToBounds();
    if (this._isMounted) {
      this.setState({ supportsFitToBounds });
    }
  };

  _loadDisplayName = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const displayName = await this.props.selectedLayer.getDisplayName();
    if (this._isMounted) {
      this.setState({ displayName });
    }
  };

  async _loadLeftJoinFields() {
    if (!this.props.selectedLayer || !isVectorLayer(this.props.selectedLayer)) {
      return;
    }

    if (
      !this.props.selectedLayer.getSource().supportsJoins() ||
      this.props.selectedLayer.getLeftJoinFields === undefined
    ) {
      return;
    }

    let leftJoinFields: JoinField[] = [];
    try {
      const leftFieldsInstances = await this.props.selectedLayer.getLeftJoinFields();
      const leftFieldPromises = leftFieldsInstances.map(async (field: IField) => {
        return {
          name: field.getName(),
          label: await field.getLabel(),
        };
      });
      leftJoinFields = await Promise.all(leftFieldPromises);
    } catch (error) {
      // ignore exceptions getting fields, will bubble up in layer errors panel
    }
    if (this._isMounted) {
      this.setState({ leftJoinFields });
    }
  }

  _onSourceChange = (...args: OnSourceChangeArgs[]) => {
    return this.props.updateSourceProps(this.props.selectedLayer!.getId(), args);
  };

  _renderFilterSection() {
    if (
      !this.props.selectedLayer ||
      isLayerGroup(this.props.selectedLayer) ||
      !isESSource(this.props.selectedLayer.getSource())
    ) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <FilterEditor />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderJoinSection() {
    if (!this.props.selectedLayer || !isVectorLayer(this.props.selectedLayer)) {
      return;
    }
    if (!this.props.selectedLayer.getSource().supportsJoins()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor
            layer={this.props.selectedLayer}
            leftJoinFields={this.state.leftJoinFields}
            layerDisplayName={this.state.displayName}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderSourceDetails() {
    return !this.props.selectedLayer || isLayerGroup(this.props.selectedLayer) ? null : (
      <SourceDetails source={this.props.selectedLayer.getSource()} />
    );
  }

  _renderSourceEditor() {
    if (!this.props.selectedLayer) {
      return null;
    }

    const descriptor = this.props.selectedLayer.getDescriptor() as VectorLayerDescriptor;
    return isLayerGroup(this.props.selectedLayer)
      ? null
      : this.props.selectedLayer.renderSourceSettingsEditor({
          currentLayerType: this.props.selectedLayer.getType(),
          hasSpatialJoins: (descriptor.joins ?? []).some(isSpatialJoin),
          numberOfJoins: descriptor.joins ? descriptor.joins.length : 0,
          onChange: this._onSourceChange,
          onStyleDescriptorChange: this.props.updateStyleDescriptor,
          style: this.props.selectedLayer.getStyleForEditing(),
        });
  }

  _renderStyleEditor() {
    return !this.props.selectedLayer || isLayerGroup(this.props.selectedLayer) ? null : (
      <StyleSettings />
    );
  }

  render() {
    if (!this.props.selectedLayer) {
      return null;
    }

    return (
      <KibanaContextProvider
        services={{
          appName: 'maps',
          storage: localStorage,
          data: getData(),
          ...getCore(),
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type={this.props.selectedLayer.getLayerTypeIconName()} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{this.state.displayName}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            {this._renderSourceDetails()}
          </EuiFlyoutHeader>

          <div className="mapLayerPanel__body">
            <div className="mapLayerPanel__bodyOverflow">
              <LayerSettings
                layer={this.props.selectedLayer}
                supportsFitToBounds={this.state.supportsFitToBounds}
              />

              {this._renderSourceEditor()}

              {this._renderFilterSection()}

              {this._renderJoinSection()}

              {this._renderStyleEditor()}
            </div>
          </div>

          <EuiFlyoutFooter className="mapLayerPanel__footer">
            <FlyoutFooter />
          </EuiFlyoutFooter>
        </EuiFlexGroup>
      </KibanaContextProvider>
    );
  }
}
