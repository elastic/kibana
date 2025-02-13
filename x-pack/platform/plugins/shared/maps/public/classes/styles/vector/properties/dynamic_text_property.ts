/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import { LabelDynamicOptions } from '../../../../../common/descriptor_types';
import { RawValue } from '../../../../../common/constants';

export class DynamicTextProperty extends DynamicStyleProperty<LabelDynamicOptions> {
  syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this._field && this._field.isValid()) {
      const targetName = this.getMbPropertyName();

      if (this._field.isCount()) {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', [
          'number-format',
          [this.getMbLookupFunction(), targetName],
          { locale: i18n.getLocale() },
        ]);
      } else {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', [
          'coalesce',
          [this.getMbLookupFunction(), targetName],
          '',
        ]);
      }
    } else {
      if (typeof mbMap.getLayoutProperty(mbLayerId, 'text-field') !== 'undefined') {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', undefined);
      }
    }
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

  getMbPropertyValue(rawValue: RawValue): RawValue {
    return this.formatField(rawValue);
  }
}
