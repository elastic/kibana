/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { SourceSelect } from './source_select/source_select';
import { FlyoutFooter } from './flyout_footer';
import { SourceEditor } from './source_editor';
import { ImportEditor } from './import_editor';
import { EuiFlexGroup, EuiTitle, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export class AddLayerPanel extends Component {
  state = {
    sourceType: null,
    layer: null,
    importView: false,
    layerImportAddReady: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (!this.state.layerImportAddReady && this.props.isIndexingSuccess) {
      this.setState({ layerImportAddReady: true });
    }
  }

  _getPanelDescription() {
    const { sourceType, importView, layerImportAddReady } = this.state;
    let panelDescription;
    if (!sourceType) {
      panelDescription = i18n.translate('xpack.maps.addLayerPanel.selectSource', {
        defaultMessage: 'Select source',
      });
    } else if (layerImportAddReady || !importView) {
      panelDescription = i18n.translate('xpack.maps.addLayerPanel.addLayer', {
        defaultMessage: 'Add layer',
      });
    } else {
      panelDescription = i18n.translate('xpack.maps.addLayerPanel.importFile', {
        defaultMessage: 'Import file',
      });
    }
    return panelDescription;
  }

  _viewLayer = async (source, options = {}) => {
    if (!this._isMounted) {
      return;
    }
    if (!source) {
      this.setState({ layer: null });
      this.props.removeTransientLayer();
      return;
    }

    const style =
      this.state.layer && this.state.layer.getCurrentStyle()
        ? this.state.layer.getCurrentStyle().getDescriptor()
        : null;
    const layerInitProps = {
      ...options,
      style: style,
    };
    const newLayer = source.createDefaultLayer(layerInitProps, this.props.mapColors);
    if (!this._isMounted) {
      return;
    }
    this.setState({ layer: newLayer }, () => this.props.viewLayer(this.state.layer));
  };

  _clearLayerData = ({ keepSourceType = false }) => {
    if (!this._isMounted) {
      return;
    }

    this.setState({
      layer: null,
      ...(!keepSourceType ? { sourceType: null, importView: false } : {}),
    });
    this.props.removeTransientLayer();
  };

  _onSourceSelectionChange = ({ type, isIndexingSource }) => {
    this.setState({ sourceType: type, importView: isIndexingSource });
  };

  _layerAddHandler = () => {
    const {
      isIndexingTriggered,
      setIndexingTriggered,
      selectLayerAndAdd,
      resetIndexing,
    } = this.props;
    const layerSource = this.state.layer.getSource();
    const boolIndexLayer = layerSource.shouldBeIndexed();
    this.setState({ layer: null });
    if (boolIndexLayer && !isIndexingTriggered) {
      setIndexingTriggered();
    } else {
      selectLayerAndAdd();
      if (this.state.importView) {
        this.setState({
          layerImportAddReady: false,
        });
        resetIndexing();
      }
    }
  };

  _renderAddLayerPanel() {
    const { sourceType, importView } = this.state;
    if (!sourceType) {
      return <SourceSelect updateSourceSelection={this._onSourceSelectionChange} />;
    }
    if (importView) {
      return (
        <ImportEditor
          clearSource={this._clearLayerData}
          viewLayer={this._viewLayer}
          onRemove={() => this._clearLayerData({ keepSourceType: true })}
        />
      );
    }
    return (
      <SourceEditor
        clearSource={this._clearLayerData}
        sourceType={sourceType}
        previewLayer={this._viewLayer}
      />
    );
  }

  _renderFooter(buttonDescription) {
    const { importView, layer } = this.state;
    const { isIndexingReady, isIndexingSuccess } = this.props;

    const buttonEnabled = importView ? isIndexingReady || isIndexingSuccess : !!layer;

    return (
      <FlyoutFooter
        showNextButton={!!this.state.sourceType}
        disableNextButton={!buttonEnabled}
        onClick={this._layerAddHandler}
        nextButtonText={buttonDescription}
      />
    );
  }

  _renderFlyout() {
    const panelDescription = this._getPanelDescription();

    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
          <EuiTitle size="s">
            <h2>{panelDescription}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
          <div className="mapLayerPanel__bodyOverflow">{this._renderAddLayerPanel()}</div>
        </div>
        {this._renderFooter(panelDescription)}
      </EuiFlexGroup>
    );
  }

  render() {
    return this.props.flyoutVisible ? this._renderFlyout() : null;
  }
}
