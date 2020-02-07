/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { AbstractTMSSource } from './tms_source';
import { TileLayer } from '../tile_layer';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../common/i18n_getters';
import _ from 'lodash';

export class XYZTMSSource extends AbstractTMSSource {
  static type = 'EMS_XYZ';
  static title = i18n.translate('xpack.maps.source.ems_xyzTitle', {
    defaultMessage: 'Tile Map Service',
  });
  static description = i18n.translate('xpack.maps.source.ems_xyzDescription', {
    defaultMessage: 'Tile map service configured in interface',
  });
  static icon = 'grid';

  static createDescriptor({ urlTemplate, attributionText, attributionUrl }) {
    return {
      type: XYZTMSSource.type,
      urlTemplate,
      attributionText,
      attributionUrl,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = XYZTMSSource.createDescriptor(sourceConfig);
      const source = new XYZTMSSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: XYZTMSSource.title },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
    ];
  }

  _createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
  }

  createDefaultLayer(options) {
    return new TileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this,
    });
  }

  async getDisplayName() {
    return this._descriptor.urlTemplate;
  }

  getAttributions() {
    const { attributionText, attributionUrl } = this._descriptor;
    const attributionComplete = !!attributionText && !!attributionUrl;

    return attributionComplete
      ? [
          {
            url: attributionUrl,
            label: attributionText,
          },
        ]
      : [];
  }

  getUrlTemplate() {
    return this._descriptor.urlTemplate;
  }
}

class XYZTMSEditor extends React.Component {
  state = {
    tmsInput: '',
    tmsCanPreview: false,
    attributionText: '',
    attributionUrl: '',
  };

  _sourceConfigChange = _.debounce(updatedSourceConfig => {
    if (this.state.tmsCanPreview) {
      this.props.onSourceConfigChange(updatedSourceConfig);
    }
  }, 2000);

  _handleTMSInputChange(e) {
    const url = e.target.value;

    const canPreview =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    this.setState(
      {
        tmsInput: url,
        tmsCanPreview: canPreview,
      },
      () => this._sourceConfigChange({ urlTemplate: url })
    );
  }

  _handleTMSAttributionChange(attributionUpdate) {
    this.setState(attributionUpdate, () => {
      const { attributionText, attributionUrl, tmsInput } = this.state;

      if (tmsInput && attributionText && attributionUrl) {
        this._sourceConfigChange({
          urlTemplate: tmsInput,
          attributionText,
          attributionUrl,
        });
      }
    });
  }

  render() {
    const { attributionText, attributionUrl } = this.state;

    return (
      <Fragment>
        <EuiFormRow label="Url">
          <EuiFieldText
            placeholder={'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            onChange={e => this._handleTMSInputChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution text"
          isInvalid={attributionUrl !== '' && attributionText === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionText', {
              defaultMessage: 'Attribution url must have accompanying text',
            }),
          ]}
        >
          <EuiFieldText
            placeholder={'© OpenStreetMap contributors'}
            onChange={({ target }) =>
              this._handleTMSAttributionChange({ attributionText: target.value })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution link"
          isInvalid={attributionText !== '' && attributionUrl === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionLink', {
              defaultMessage: 'Attribution text must have an accompanying link',
            }),
          ]}
        >
          <EuiFieldText
            placeholder={'https://www.openstreetmap.org/copyright'}
            onChange={({ target }) =>
              this._handleTMSAttributionChange({ attributionUrl: target.value })
            }
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
