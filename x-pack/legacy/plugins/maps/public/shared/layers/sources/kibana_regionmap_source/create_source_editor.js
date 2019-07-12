/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import { getKibanaRegionList } from '../../../../meta';
import { i18n } from '@kbn/i18n';

export class CreateSourceEditor extends React.Component {

  state  = {
    regionmapLayers: []
  }

  _loadList = async () => {
    const list = getKibanaRegionList();
    if (this._isMounted) {
      this.setState({
        regionmapLayers: list
      });
    }
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadList();
  }

  render() {

    const onChange = ({ target }) => {
      const selectedName = target.options[target.selectedIndex].text;
      this.props.onSelect({ name: selectedName });
    };

    const regionmapOptions = this.state.regionmapLayers.map(({ name, url }) => {
      return {
        value: url,
        text: name
      };
    });

    return (
      <EuiFormRow
        label={
          i18n.translate('xpack.maps.source.kbnRegionMap.vectorLayerLabel', {
            defaultMessage: 'Vector layer'
          })
        }
        helpText={this.state.regionmapLayers.length === 0 ?  i18n.translate('xpack.maps.source.kbnRegionMap.noLayerAvailableHelptext', {
          defaultMessage: `No vector layers are available. Ask your system administrator to set "map.regionmap" in kibana.yml.`
        })
          : null}
      >
        <EuiSelect
          hasNoInitialSelection
          options={regionmapOptions}
          onChange={onChange}
          disabled={this.state.regionmapLayers.length === 0}
        />
      </EuiFormRow>
    );
  }
}

CreateSourceEditor.propTypes = {
  onSelect: PropTypes.func.isRequired
};


