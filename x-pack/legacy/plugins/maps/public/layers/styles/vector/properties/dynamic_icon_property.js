/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { getOtherCategoryLabel, assignCategoriesToPalette } from '../style_util';
import { DynamicStyleProperty } from './dynamic_style_property';
import { getIconPalette, getMakiIconId, getMakiSymbolAnchor } from '../symbol_utils';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui';
import { Category } from '../components/legend/category';

export class DynamicIconProperty extends DynamicStyleProperty {
  isOrdinal() {
    return false;
  }

  isCategorical() {
    return true;
  }

  syncIconWithMb(symbolLayerId, mbMap, iconPixelSize) {
    if (this._isIconDynamicConfigComplete()) {
      mbMap.setLayoutProperty(
        symbolLayerId,
        'icon-image',
        this._getMbIconImageExpression(iconPixelSize)
      );
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this._getMbIconAnchorExpression());
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', null);
    }
  }

  _getPaletteStops() {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      const stops = [];
      for (let i = 1; i < this._options.customIconStops.length; i++) {
        const { stop, icon } = this._options.customIconStops[i];
        stops.push({
          stop,
          style: icon,
        });
      }

      return {
        fallback:
          this._options.customIconStops.length > 0 ? this._options.customIconStops[0].icon : null,
        stops,
      };
    }

    return assignCategoriesToPalette({
      categories: _.get(this.getCategoryFieldMeta(), 'categories', []),
      paletteValues: getIconPalette(this._options.iconPaletteId),
    });
  }

  _getMbIconImageExpression(iconPixelSize) {
    const { stops, fallback } = this._getPaletteStops();

    if (stops.length < 1 || !fallback) {
      //occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiIconId(style, iconPixelSize));
    });
    mbStops.push(getMakiIconId(fallback, iconPixelSize)); //last item is fallback style for anything that does not match provided stops
    return ['match', ['to-string', ['get', this._options.field.name]], ...mbStops];
  }

  _getMbIconAnchorExpression() {
    const { stops, fallback } = this._getPaletteStops();

    if (stops.length < 1 || !fallback) {
      //occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiSymbolAnchor(style));
    });
    mbStops.push(getMakiSymbolAnchor(fallback)); //last item is fallback style for anything that does not match provided stops
    return ['match', ['to-string', ['get', this._options.field.name]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid();
  }

  renderBreakedLegend({ fieldLabel, isPointsOnly, isLinesOnly }) {
    const categories = [];
    const { stops, fallback } = this._getPaletteStops();
    stops.map(({ stop, style }) => {
      categories.push(
        <Category
          key={stop}
          styleName={this.getStyleName()}
          label={this.formatField(stop)}
          color="grey"
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={style}
        />
      );
    });

    if (fallback) {
      categories.push(
        <Category
          key="fallbackCategory"
          styleName={this.getStyleName()}
          label={<EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>}
          color="grey"
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={fallback}
        />
      );
    }

    return (
      <div>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {categories}
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" title={this.getDisplayStyleName()} content={fieldLabel}>
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{fieldLabel}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
