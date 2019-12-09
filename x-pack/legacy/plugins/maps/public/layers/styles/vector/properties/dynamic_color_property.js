/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { DynamicStyleProperty } from './dynamic_style_property';
import _ from 'lodash';
import { getComputedFieldName } from '../style_util';
import { getColorRampStops } from '../../color_utils';
import { ColorGradient } from '../../components/color_gradient';
import React from 'react';


export class DynamicColorProperty extends DynamicStyleProperty {

  syncCircleColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'circle-color', color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-color', color);
  }

  syncHaloBorderColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', color);
  }

  syncCircleStrokeWithMb(pointLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'fill-color', color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncLineColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'line-color', color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  isCustomColorRamp() {
    return this._options.useCustomColorRamp;
  }

  supportsFeatureState() {
    return this._options.type !== 'term';
  }

  isScaled() {
    return !this.isCustomColorRamp();
  }

  _getMbColor() {

    const isDynamicConfigComplete = _.has(this._options, 'field.name') && _.has(this._options, 'color');
    if (!isDynamicConfigComplete) {
      return null;
    }

    if (this._options.useCustomColorRamp && (!this._options.customColorRamp || !this._options.customColorRamp.length)) {
      return null;
    }

    return this._getMBDataDrivenColor();
  }

  _getMBDataDrivenColor() {
    const targetName = getComputedFieldName(this._styleName, this._options.field.name);
    const colorStops = this._getMBColorStops();

    if (this._options.type === 'term') {

      const mbStops = [];
      if (this._options.customColorRamp) {
        this._options.customColorRamp.forEach((stop) => {
          mbStops.push(stop.stop);
          mbStops.push(stop.color);
        });
      }
      mbStops.push('rgba(0,0,0,0)');
      const expression = [
        'match', ['get', this._options.field.name],
        ...mbStops,
      ];
      return expression;

    } else {

      if (this._options.useCustomColorRamp) {
        const firstStopValue = colorStops[0];
        const lessThenFirstStopValue = firstStopValue - 1;
        return [
          'step',
          ['coalesce', ['feature-state', targetName], lessThenFirstStopValue],
          'rgba(0,0,0,0)', // MB will assign the base value to any features that is below the first stop value
          ...colorStops
        ];
      } else {
        return [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', targetName], -1],
          -1, 'rgba(0,0,0,0)',
          ...colorStops
        ];
      }

    }


  }


  _getMBColorStops() {

    if (this._options.useCustomColorRamp) {
      return this._options.customColorRamp.reduce((accumulatedStops, nextStop) => {
        return [...accumulatedStops, nextStop.stop, nextStop.color];
      }, []);
    }

    return getColorRampStops(this._options.color);
  }

  renderHeader() {
    if  (this._options.type === 'term') {
      return (<span>Must show legend</span>);
    } else {
      if (this._options.color) {
        return (<ColorGradient colorRampName={this._options.color}/>);
      } else {
        return null;
      }
    }
  }

}





