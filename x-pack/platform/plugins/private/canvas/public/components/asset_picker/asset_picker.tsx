/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, useMemo } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiImage,
  EuiIcon,
  transparentize,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { CanvasAsset } from '../../../types';
import { useCanvasCheckeredStyles } from '../../lib/use_canvas_checkered_styles';

const strings = {
  getAssetAltText: () =>
    i18n.translate('xpack.canvas.assetpicker.assetAltText', {
      defaultMessage: 'Asset thumbnail',
    }),
};

const AssetPickerGrid: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const scrollBar = useEuiScrollBar();
  const styles = useMemo(
    () => css`
      ${scrollBar}

      & .canvasAssetPicker__link:hover {
        outline: solid ${euiTheme.size.xs} ${transparentize(euiTheme.colors.primary, 0.1)};
      }
    `,
    [euiTheme, scrollBar]
  );

  return (
    <EuiFlexGrid
      id="canvasAssetPicker"
      className="canvasAssetPicker"
      css={styles}
      gutterSize="s"
      columns={4}
    >
      {children}
    </EuiFlexGrid>
  );
};

const CheckeredFlexItem: FC<PropsWithChildren<{ id?: string }>> = ({ children, id }) => {
  const checkeredStyles = useCanvasCheckeredStyles();

  return (
    <EuiFlexItem id={id} className="canvasCheckered" css={checkeredStyles}>
      {children}
    </EuiFlexItem>
  );
};

interface Props {
  assets: CanvasAsset[];
  selected?: string;
  onChange: (asset: CanvasAsset) => void;
}

export class AssetPicker extends PureComponent<Props> {
  componentDidMount() {
    const selectedAsset = document.getElementById('canvasAssetPicker__selectedAsset');
    if (selectedAsset) {
      selectedAsset.scrollIntoView();
    }
  }

  render() {
    const { assets, selected, onChange } = this.props;

    return (
      <AssetPickerGrid>
        {assets.map((asset) => (
          <CheckeredFlexItem
            key={asset.id}
            id={asset.id === selected ? 'canvasAssetPicker__selectedAsset' : ''}
          >
            <EuiLink
              className={`canvasAssetPicker__link`}
              disabled={asset.id === selected}
              onClick={() => onChange(asset)}
            >
              <EuiImage url={asset.value} alt={strings.getAssetAltText()} />
              {asset.id === selected && (
                <EuiIcon
                  className="canvasAssetPicker__selected"
                  type="checkCircleFill"
                  aria-label={i18n.translate('xpack.canvas.assetpicker.selectedIconAriaLabel', {
                    defaultMessage: 'Selected',
                  })}
                />
              )}
            </EuiLink>
          </CheckeredFlexItem>
        ))}
      </AssetPickerGrid>
    );
  }
}
