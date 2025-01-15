/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import { getMakiSymbolAnchor } from '../symbol_utils';
import { IconStaticOptions } from '../../../../../common/descriptor_types';

export class StaticIconProperty extends StaticStyleProperty<IconStaticOptions> {
  syncIconWithMb(symbolLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this.getSymbolAnchor());
    mbMap.setLayoutProperty(symbolLayerId, 'icon-image', this._options.value);
  }

  getSymbolAnchor() {
    return getMakiSymbolAnchor(this._options.value);
  }
}
