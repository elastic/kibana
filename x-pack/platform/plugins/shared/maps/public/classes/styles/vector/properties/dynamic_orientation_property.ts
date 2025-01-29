/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { OrientationDynamicOptions } from '../../../../../common/descriptor_types';

export class DynamicOrientationProperty extends DynamicStyleProperty<OrientationDynamicOptions> {
  syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      const targetName = this.getMbPropertyName();
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', [
        'coalesce',
        [this.getMbLookupFunction(), targetName],
        0,
      ]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', 0);
    }
  }

  supportsFieldMeta() {
    return false;
  }

  supportsFeatureState(): boolean {
    return false;
  }
}
