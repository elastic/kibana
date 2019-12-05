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
}
