/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';

import { EMS_TILE_AUTO_ID } from './constants';
import { getEmsTMSServices } from '../../../../meta';
import { getEmsUnavailableMessage } from '../ems_unavailable_message';
import { i18n } from '@kbn/i18n';

export class EMSTMSCreateSourceEditor extends React.Component {

  state = {
    emsTmsOptionsRaw: null
  };

  _loadTmsOptions = async () => {
    const options = await getEmsTMSServices();
    options.push({
      id: EMS_TILE_AUTO_ID,
      name: i18n.translate('xpack.maps.source.emsTile.autoLabel', {
        defaultMessage: 'Auto',
      })
    });
    if (this._isMounted) {
      this.setState({
        emsTmsOptionsRaw: options
      });
    }
  }

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

    const emsTileOptions = this.state.emsTmsOptionsRaw.map((service) => ({
      value: service.id,
      text: service.name || service.id
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
          onChange={this.props.onChange}
          disabled={this.state.emsTmsOptionsRaw.length === 0}
        />
      </EuiFormRow>
    );
  }
}
