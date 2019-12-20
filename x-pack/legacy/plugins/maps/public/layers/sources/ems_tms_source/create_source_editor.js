/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSelect, EuiFormRow } from '@elastic/eui';

import { getEMSClient } from '../../../meta';
import { getEmsUnavailableMessage } from '../ems_unavailable_message';
import { i18n } from '@kbn/i18n';

export const AUTO_SELECT = 'auto_select';

export class EMSTMSCreateSourceEditor extends React.Component {
  state = {
    emsTmsOptionsRaw: null,
  };

  _loadTmsOptions = async () => {
    const emsClient = getEMSClient();
    const emsTMSServices = await emsClient.getTMSServices();
    const options = emsTMSServices.map(tmsService => {
      return {
        id: tmsService.getId(),
        name: tmsService.getDisplayName(),
      };
    });
    options.unshift({
      id: AUTO_SELECT,
      name: i18n.translate('xpack.maps.source.emsTile.autoLabel', {
        defaultMessage: 'Autoselect based on Kibana theme',
      }),
    });
    if (this._isMounted) {
      this.setState({
        emsTmsOptionsRaw: options,
      });
    }
  };

  _onEmsTileServiceChange = e => {
    const value = e.target.value;
    const isAutoSelect = value === AUTO_SELECT;
    this.props.onSourceConfigChange({
      id: isAutoSelect ? null : value,
      isAutoSelect,
    });
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadTmsOptions();
  }

  render() {
    if (!this.state.emsTmsOptionsRaw) {
      // TODO display loading message
      return null;
    }

    const emsTileOptions = this.state.emsTmsOptionsRaw.map(service => ({
      value: service.id,
      text: service.name || service.id,
    }));

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsTile.label', {
          defaultMessage: 'Tile service',
        })}
        helpText={this.state.emsTmsOptionsRaw.length === 0 ? getEmsUnavailableMessage() : null}
      >
        <EuiSelect
          hasNoInitialSelection
          options={emsTileOptions}
          onChange={this._onEmsTileServiceChange}
          disabled={this.state.emsTmsOptionsRaw.length === 0}
        />
      </EuiFormRow>
    );
  }
}
