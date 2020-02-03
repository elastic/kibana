/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';
import { VECTOR_STYLES } from '../vector_style_defaults';

export class DynamicOrientationProperty extends DynamicStyleProperty {
  syncIconRotationWithMb(symbolLayerId, mbMap) {
    if (this._options.field && this._options.field.name) {
      const targetName = getComputedFieldName(
        VECTOR_STYLES.ICON_ORIENTATION,
        this._options.field.name
      );
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', ['coalesce', ['get', targetName], 0]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', 0);
    }
  }

  supportsFeatureState() {
    return false;
  }

  isOrdinalScaled() {
    return false;
  }
}
