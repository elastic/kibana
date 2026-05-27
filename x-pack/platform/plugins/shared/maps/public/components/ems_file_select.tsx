/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';
import { getEmsUnavailableMessage } from './ems_unavailable_message';

interface Props {
  isColumnCompressed?: boolean;
  onChange: (emsFileId: string) => void;
  value: string | null;
  fullWidth?: boolean;
}

interface State {
  hasLoadedOptions: boolean;
  emsFileOptions: Array<EuiComboBoxOptionOption<string>>;
}

export class EMSFileSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoadedOptions: false,
    emsFileOptions: [],
  };

  _loadFileOptions = async () => {
    let fileLayers: FileLayer[] = [];
    try {
      fileLayers = await getEmsFileLayers();
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          hasLoadedOptions: true,
          emsFileOptions: [],
        });
      }
    }

    const options = fileLayers.map((fileLayer) => {
      return {
        value: fileLayer.getId(),
        label: fileLayer.getDisplayName(),
      };
    });
    if (this._isMounted) {
      this.setState({
        hasLoadedOptions: true,
        emsFileOptions: options,
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

  _onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      return;
    }

    this.props.onChange(selectedOptions[0].value!);
  };

  _renderSelect() {
    if (!this.state.hasLoadedOptions) {
      return <EuiSelect isLoading />;
    }

    const selectedOption = this.state.emsFileOptions.find(
      (option: EuiComboBoxOptionOption<string>) => {
        return option.value === this.props.value;
      }
    );

    return (
      <EuiComboBox
        placeholder={i18n.translate('xpack.maps.emsFileSelect.selectPlaceholder', {
          defaultMessage: 'Select EMS boundaries',
        })}
        options={this.state.emsFileOptions}
        selectedOptions={selectedOption ? [selectedOption!] : []}
        onChange={this._onChange}
        isClearable={false}
        singleSelection={true}
        isDisabled={this.state.emsFileOptions.length === 0}
        data-test-subj="emsFileSelect"
      />
    );
  }

  render() {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsFileSelect.selectLabel', {
          defaultMessage: 'EMS boundaries',
        })}
        helpText={this.state.emsFileOptions.length === 0 ? getEmsUnavailableMessage() : null}
        display={this.props.isColumnCompressed ? 'columnCompressed' : 'row'}
        fullWidth={this.props.fullWidth}
      >
        {this._renderSelect()}
      </EuiFormRow>
    );
  }
}
