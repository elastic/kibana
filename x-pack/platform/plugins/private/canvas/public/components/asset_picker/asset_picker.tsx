/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiLink, EuiImage, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CanvasAsset } from '../../../types';

const strings = {
  getAssetAltText: () =>
    i18n.translate('xpack.canvas.assetpicker.assetAltText', {
      defaultMessage: 'Asset thumbnail',
    }),
};

interface Props {
  assets: CanvasAsset[];
  selected?: string;
  onChange: (asset: CanvasAsset) => void;
}

export class AssetPicker extends PureComponent<Props> {
  static propTypes = {
    assets: PropTypes.array.isRequired,
    selected: PropTypes.string,
    onChange: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const selectedAsset = document.getElementById('canvasAssetPicker__selectedAsset');
    if (selectedAsset) {
      selectedAsset.scrollIntoView();
    }
  }

  render() {
    const { assets, selected, onChange } = this.props;

    return (
      <EuiFlexGrid id="canvasAssetPicker" className="canvasAssetPicker" gutterSize="s" columns={4}>
        {assets.map((asset) => (
          <EuiFlexItem
            key={asset.id}
            id={asset.id === selected ? 'canvasAssetPicker__selectedAsset' : ''}
            className="canvasCheckered"
          >
            <EuiLink
              className={`canvasAssetPicker__link`}
              disabled={asset.id === selected}
              onClick={() => onChange(asset)}
            >
              <EuiImage url={asset.value} alt={strings.getAssetAltText()} />
              {asset.id === selected && (
                <EuiIcon className="canvasAssetPicker__selected" type="checkInCircleFilled" />
              )}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }
}
