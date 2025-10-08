/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapAttributes } from '../../server';

export class MapSettingsCollector {
  private _customIconsCount: number = 0;

  constructor(attributes: MapAttributes) {
    if (!attributes?.settings) {
      return;
    }

    if (attributes.settings.customIcons) {
      this._customIconsCount = attributes.settings.customIcons.length;
    }
  }

  getCustomIconsCount() {
    return this._customIconsCount;
  }
}
