/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractStyle } from './abstract_style';
import { i18n } from '@kbn/i18n';

export class TileStyle extends AbstractStyle {

  static type = 'TILE';

  constructor(styleDescriptor = {}) {
    super();
    this._descriptor = TileStyle.createDescriptor(styleDescriptor.properties);
  }

  static createDescriptor(properties = {}) {
    return {
      type: TileStyle.type,
      properties: {
        ...properties,
      }
    };
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.tile.displayNameLabel', {
      defaultMessage: 'Tile style'
    });
  }
}
