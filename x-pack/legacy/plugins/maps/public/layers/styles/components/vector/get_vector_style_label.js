/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { vectorStyles } from '../../vector_style_defaults';

export function getVectorStyleLabel(styleName) {
  switch (styleName) {
    case vectorStyles.FILL_COLOR:
      return i18n.translate('xpack.maps.styles.vector.fillColorLabel', {
        defaultMessage: 'Fill color',
      });
    case vectorStyles.LINE_COLOR:
      return i18n.translate('xpack.maps.styles.vector.borderColorLabel', {
        defaultMessage: 'Border color',
      });
    case vectorStyles.LINE_WIDTH:
      return i18n.translate('xpack.maps.styles.vector.borderWidthLabel', {
        defaultMessage: 'Border width',
      });
    case vectorStyles.ICON_SIZE:
      return i18n.translate('xpack.maps.styles.vector.symbolSizeLabel', {
        defaultMessage: 'Symbol size',
      });
    default:
      return styleName;
  }
}
