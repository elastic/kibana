/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';

import _ from 'lodash';
import crypto from 'crypto';
import { AbstractSource } from './source';
import { VectorTileLayer } from '../vector_tile_layer';

import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../common/i18n_getters';

// Unlike raster tiles and EMS vector tiles, custom vector tiles can have multiple sources
// so we do not implement the getUrlTemplate function required by AbstractTMSSource.
export class VectorTileSource extends AbstractSource {

  static type = 'VECTOR_TILE';
  static title = i18n.translate('xpack.maps.source.vectorTileTitle', {
    defaultMessage: 'Vector Tile Source'
  });
  static description = i18n.translate('xpack.maps.source.vectorTileDescription', {
    defaultMessage: 'Vector tile service configured in interface'
  });
  static icon = 'grid';

  static createDescriptor(sourceConfig) {
    return {
      type: VectorTileSource.type,
      styleUrl: sourceConfig.styleUrl
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = (sourceConfig) => {
      const descriptor = VectorTileSource.createDescriptor(sourceConfig);
      const source = new VectorTileSource(descriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <VectorTileSourceEditor onSourceConfigChange={onSourceConfigChange}/>;
  }

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: VectorTileSource.title
      },
      {
        label: getUrlLabel(),
        value: this._descriptor.styleUrl
      }
    ];
  }

  async _getVectorStyleJson() {
    const resp = await fetch(this._descriptor.styleUrl);
    if(!resp.ok) {
      throw new Error(`Unable to access ${this._descriptor.styleUrl}`);
    }
    const style = await resp.json();
    return style;
  }

  _createDefaultLayerDescriptor(options) {
    return VectorTileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new VectorTileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  async getDisplayName() {
    const styleJson = await this._getVectorStyleJson();
    return _.get(styleJson, 'name', this._descriptor.styleUrl);
  }

  async getAttributions() {
    // TODO Can mapbox-gl automatically retrieve this from style sources?
    return [];
  }

  getSpriteNamespacePrefix() {
    return null;
  }

  async getVectorStyleSheetAndSpriteMeta() {
    const vectorStyleSheet = await this._getVectorStyleJson();
    return {
      vectorStyleSheet
    };
  }

  _getTileLayerId() {
    return crypto.createHash('md5').update(this._descriptor.styleUrl).digest('hex');
  }
}

class VectorTileSourceEditor extends React.Component {

  state = {
    tmsInput: '',
    tmsCanPreview: false,
    attributionText: '',
    attributionUrl: '',
  }

  _sourceConfigChange = _.debounce(updatedSourceConfig => {
    if (this.state.tmsCanPreview) {
      this.props.onSourceConfigChange(updatedSourceConfig);
    }
  }, 2000);

  _handleStyleInputChange(e) {
    const url = e.target.value;

    const canPreview = true;
    this.setState({
      tmsInput: url,
      tmsCanPreview: canPreview
    }, () => this._sourceConfigChange({ styleUrl: url }));
  }

  _handleAttributionChange(attributionUpdate) {
    this.setState(attributionUpdate, () => {
      const {
        attributionText,
        attributionUrl,
        tmsInput,
      } = this.state;

      if (tmsInput && attributionText && attributionUrl) {
        this._sourceConfigChange({
          urlTemplate: tmsInput,
          attributionText,
          attributionUrl
        });
      }
    });
  }

  render() {
    const {
      attributionText,
      attributionUrl,
    } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label="Url"
        >
          <EuiFieldText
            placeholder={'https://tiles.maps.elastic.co/styles/osm-bright.json'}
            onChange={e => this._handleStyleInputChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution text"
          isInvalid={attributionUrl !== '' && attributionText === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionText', {
              defaultMessage:
                'Attribution url must have accompanying text',
            })
          ]}
        >
          <EuiFieldText
            placeholder={'© OpenStreetMap contributors'}
            onChange={({ target }) =>
              this._handleAttributionChange({ attributionText: target.value })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution link"
          isInvalid={attributionText !== '' && attributionUrl === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionLink', {
              defaultMessage:
                'Attribution text must have an accompanying link',
            })
          ]}
        >
          <EuiFieldText
            placeholder={'https://www.openstreetmap.org/copyright'}
            onChange={({ target }) =>
              this._handleAttributionChange({ attributionUrl: target.value })
            }
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
