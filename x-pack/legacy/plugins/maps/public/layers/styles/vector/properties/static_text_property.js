/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticStyleProperty } from './static_style_property';

export class StaticTextProperty extends StaticStyleProperty {

  isComplete() {
    return this.getOptions().value.length > 0;
  }

  syncTextFieldWithMb(mbLayerId, mbMap) {
    mbMap.setLayoutProperty(mbLayerId, 'text-field', this.getOptions().value);
  }
}
