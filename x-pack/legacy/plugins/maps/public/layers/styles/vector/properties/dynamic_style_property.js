/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractStyleProperty } from './style_property';
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
      return !!this._field;
    }

    getFieldOrigin() {
      return this._options.field.origin;
    }

    supportsFeatureState() {
      return true;
    }

    isScaled() {
      return true;
    }
}
