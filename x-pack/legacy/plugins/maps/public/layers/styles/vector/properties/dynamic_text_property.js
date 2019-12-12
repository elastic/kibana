/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';

export class DynamicTextProperty extends DynamicStyleProperty {

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
