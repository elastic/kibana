/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractStyleProperty } from './style_property';
import _ from 'lodash';

export class DynamicStyleProperty extends AbstractStyleProperty {
    static type = 'DYNAMIC';

    constructor(options, styleName) {
      super(options);
      this._styleName = styleName;
    }

    _isSizeDynamicConfigComplete() {
      return _.has(this._options, 'field.name') && _.has(this._options, 'minSize') && _.has(this._options, 'maxSize');
    }


}
