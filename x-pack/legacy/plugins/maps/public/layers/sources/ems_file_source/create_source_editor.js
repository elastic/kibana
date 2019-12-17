/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { getEMSClient } from '../../../meta';
import { getEmsUnavailableMessage } from '../ems_unavailable_message';
import { i18n } from '@kbn/i18n';

export class EMSFileCreateSourceEditor extends React.Component {
  state = {
    emsFileOptionsRaw: null,
    selectedOption: null,
  };

  _loadFileOptions = async () => {
    const emsClient = getEMSClient();
    const fileLayers = await emsClient.getFileLayers();
    const options = fileLayers.map(fileLayer => {
      return {
        id: fileLayer.getId(),
        name: fileLayer.getDisplayName(),
      };
    });
    if (this._isMounted) {
      this.setState({
        emsFileOptionsRaw: options,
      });
    }
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFileOptions();
  }

  _onChange = selectedOptions => {
    if (selectedOptions.length === 0) {
      return;
    }

    this.setState({ selectedOption: selectedOptions[0] });

    const emsFileId = selectedOptions[0].value;
    this.props.onSourceConfigChange({ id: emsFileId });
  };

  render() {
    if (!this.state.emsFileOptionsRaw) {
      // TODO display loading message
      return null;
    }

    const options = this.state.emsFileOptionsRaw.map(({ id, name }) => {
      return { label: name, value: id };
    });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: 'Layer',
        })}
        helpText={this.state.emsFileOptionsRaw.length === 0 ? getEmsUnavailableMessage() : null}
      >
        <EuiComboBox
          placeholder={i18n.translate('xpack.maps.source.emsFile.selectPlaceholder', {
            defaultMessage: 'Select EMS vector shapes',
          })}
          options={options}
          selectedOptions={this.state.selectedOption ? [this.state.selectedOption] : []}
          onChange={this._onChange}
          isClearable={false}
          singleSelection={true}
          isDisabled={this.state.emsFileOptionsRaw.length === 0}
          data-test-subj="emsVectorComboBox"
        />
      </EuiFormRow>
    );
  }
}
