/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { AbstractStyleProperty } from './style_property';
import { DEFAULT_SIGMA } from '../vector_style_defaults';
import { STYLE_TYPE } from '../../../../../common/constants';

export class DynamicStyleProperty extends AbstractStyleProperty {
    static type = STYLE_TYPE.DYNAMIC;

    constructor(options, styleName, field) {
      super(options, styleName);
      this._field = field;
    }

    getField() {
      return this._field;
    }

    isDynamic() {
      return true;
    }

    isComplete() {
      return !!this._field;
    }

    getFieldOrigin() {
      return this._field.getOrigin();
    }

    isFieldMetaEnabled() {
      const fieldMetaOptions = this.getFieldMetaOptions();
      return this.supportsFieldMeta() && _.get(fieldMetaOptions, 'isEnabled', true);
    }

    supportsFieldMeta() {
      return this.isComplete() && this.isScaled() && this._field.supportsFieldMeta();
    }

    async getFieldMetaRequest() {
      const fieldMetaOptions = this.getFieldMetaOptions();
      return this._field.getFieldMetaRequest({
        sigma: _.get(fieldMetaOptions, 'sigma', DEFAULT_SIGMA),
      });
    }

    supportsFeatureState() {
      return true;
    }

    isScaled() {
      return true;
    }

    getFieldMetaOptions() {
      return _.get(this.getOptions(), 'fieldMetaOptions', {});
    }


    pluckStyleMetaFromFeatures(features) {

      const name = this.getField().getName();
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const newValue = parseFloat(feature.properties[name]);
        if (!isNaN(newValue)) {
          min = Math.min(min, newValue);
          max = Math.max(max, newValue);
        }
      }

      return (min === Infinity || max === -Infinity) ?  null : ({
        min: min,
        max: max,
        delta: max - min
      });

    }

    pluckStyleMetaFromFieldMetaData(fieldMetaData) {

      const realFieldName = this._field.getESDocFieldName ? this._field.getESDocFieldName() : this._field.getName();
      const stats = fieldMetaData[realFieldName];
      if (!stats) {
        return null;
      }

      const sigma = _.get(this.getFieldMetaOptions(), 'sigma', DEFAULT_SIGMA);
      const stdLowerBounds = stats.avg - (stats.std_deviation * sigma);
      const stdUpperBounds = stats.avg + (stats.std_deviation * sigma);
      const min = Math.max(stats.min, stdLowerBounds);
      const max = Math.min(stats.max, stdUpperBounds);
      return {
        min,
        max,
        delta: max - min,
        isMinOutsideStdRange: stats.min < stdLowerBounds,
        isMaxOutsideStdRange: stats.max > stdUpperBounds,
      };

    }

}
