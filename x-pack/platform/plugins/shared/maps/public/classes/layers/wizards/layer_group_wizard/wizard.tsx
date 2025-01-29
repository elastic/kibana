/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, Component } from 'react';
import { EuiFieldText, EuiFormRow, EuiPanel } from '@elastic/eui';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { DEFAULT_LAYER_GROUP_LABEL, LayerGroup } from '../../layer_group';

interface State {
  label: string;
}

export class LayerGroupWizard extends Component<RenderWizardArguments, State> {
  state: State = {
    label: DEFAULT_LAYER_GROUP_LABEL,
  };

  componentDidMount() {
    this._previewLayer();
  }

  _onLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState(
      {
        label: e.target.value,
      },
      this._previewLayer
    );
  };

  _previewLayer() {
    const layerDescriptor = LayerGroup.createDescriptor({
      label: this.state.label,
    });

    this.props.previewLayers([layerDescriptor]);
  }

  render() {
    return (
      <EuiPanel>
        <EuiFormRow
          label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText value={this.state.label} onChange={this._onLabelChange} />
        </EuiFormRow>
      </EuiPanel>
    );
  }
}
