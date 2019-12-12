/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';

export class DynamicTextProperty extends DynamicStyleProperty {

  syncTextFieldWithMb(mbLayerId, mbMap) {
    const targetName = getComputedFieldName(this._styleName, this._options.field.name);
    mbMap.setLayoutProperty(mbLayerId, 'text-field', ['coalesce', ['get', targetName], '']);
  }

  isOrdinal() {
    return false;
  }

  supportsFieldMeta() {
    return false;
  }

  supportsFeatureState() {
    return false;
  }

  isScaled() {
    return false;
  }

  renderHeader() {
    return null;
  }
}
