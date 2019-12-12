/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';
import { HALF_LARGE_MAKI_ICON_SIZE, LARGE_MAKI_ICON_SIZE, SMALL_MAKI_ICON_SIZE } from '../symbol_utils';
import { VECTOR_STYLES } from '../vector_style_defaults';
import _ from 'lodash';
import { CircleIcon } from '../components/legend/circle_icon';
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

function getLineWidthIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'none',
    width: '12px',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '1px' }}/>,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '2px' }}/>,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '3px' }}/>,
  ];
}

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'grey',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, width: '4px' }}/>,
    <CircleIcon style={{ ...defaultStyle, width: '8px' }}/>,
    <CircleIcon style={{ ...defaultStyle, width: '12px' }}/>,
  ];
}

export class DynamicSizeProperty extends DynamicStyleProperty {

  syncHaloWidthWithMb(mbLayerId, mbMap) {
    const haloWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }


  syncIconImageAndSizeWithMb(symbolLayerId, mbMap, symbolId) {
    if (this._isSizeDynamicConfigComplete(this._options)) {
      const iconPixels = this._options.maxSize >= HALF_LARGE_MAKI_ICON_SIZE
        ? LARGE_MAKI_ICON_SIZE
        : SMALL_MAKI_ICON_SIZE;
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', `${symbolId}-${iconPixels}`);

      const halfIconPixels = iconPixels / 2;
      const targetName = getComputedFieldName(VECTOR_STYLES.ICON_SIZE, this._options.field.name);
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', targetName], 0],
        0, this._options.minSize / halfIconPixels,
        1, this._options.maxSize / halfIconPixels
      ]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', null);
    }
  }

  syncCircleStrokeWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
  }

  syncCircleRadiusWithMb(mbLayerId, mbMap) {
    const circleRadius = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', circleRadius);
  }

  syncLineWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'line-width', lineWidth);
  }

  _getMbSize() {
    if (this._isSizeDynamicConfigComplete(this._options)) {
      return this._getMbDataDrivenSize({
        targetName: getComputedFieldName(this._styleName, this._options.field.name),
        minSize: this._options.minSize,
        maxSize: this._options.maxSize,
      });
    }
    return null;
  }

  _getMbDataDrivenSize({ targetName, minSize, maxSize }) {
    return   [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', targetName], 0],
      0, minSize,
      1, maxSize
    ];
  }

  _isSizeDynamicConfigComplete() {
    return this._field && this._field.isValid() && _.has(this._options, 'minSize') && _.has(this._options, 'maxSize');
  }

  renderHeader() {
    let icons;
    if (this.getStyleName() === VECTOR_STYLES.LINE_WIDTH) {
      icons = getLineWidthIcons();
    } else if (this.getStyleName() === VECTOR_STYLES.ICON_SIZE) {
      icons = getSymbolSizeIcons();
    } else {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
        {
          icons.map((icon, index) => {
            const isLast = index === icons.length - 1;
            let spacer;
            if (!isLast) {
              spacer = (
                <EuiFlexItem>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
              );
            }
            return (
              <Fragment key={index}>
                <EuiFlexItem grow={false}>
                  {icon}
                </EuiFlexItem>
                {spacer}
              </Fragment>
            );
          })
        }
      </EuiFlexGroup>
    );
  }
}
