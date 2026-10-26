/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { LabelStaticOptions } from '../../../../../common/descriptor_types';

export class StaticTextProperty extends StaticStyleProperty<LabelStaticOptions> {
  isComplete() {
    return this.getOptions().value.length > 0;
  }

  syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this.getOptions().value.length) {
      mbMap.setLayoutProperty(mbLayerId, 'text-field', this.getOptions().value);
    } else {
      if (typeof mbMap.getLayoutProperty(mbLayerId, 'text-field') !== 'undefined') {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', undefined);
      }
    }
  }
}
