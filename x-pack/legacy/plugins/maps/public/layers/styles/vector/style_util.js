/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getOtherCategoryLabel() {
  return i18n.translate('xpack.maps.styles.categorical.otherCategoryLabel', {
    defaultMessage: 'Other',
  });
}

export function getComputedFieldName(styleName, fieldName) {
  return `${getComputedFieldNamePrefix(fieldName)}__${styleName}`;
}

export function getComputedFieldNamePrefix(fieldName) {
  return `__kbn__dynamic__${fieldName}`;
}

export function isOnlySingleFeatureType(featureType, supportedFeatures, hasFeatureType) {
  if (supportedFeatures.length === 1) {
    return supportedFeatures[0] === featureType;
  }

  const featureTypes = Object.keys(hasFeatureType);
  return featureTypes.reduce((isOnlyTargetFeatureType, featureTypeKey) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType
      ? isOnlyTargetFeatureType && hasFeature
      : isOnlyTargetFeatureType && !hasFeature;
  }, true);
}

export function scaleValue(value, range) {
  if (isNaN(value) || !range) {
    return -1; //Nothing to scale, put outside scaled range
  }

  if (range.delta === 0 || value >= range.max) {
    return 1; //snap to end of scaled range
  }

  if (value <= range.min) {
    return 0; //snap to beginning of scaled range
  }

  return (value - range.min) / range.delta;
}

export function assignCategoriesToPalette({ categories, paletteValues }) {
  const stops = [];
  let fallback = null;

  if (categories && categories.length && paletteValues && paletteValues.length) {
    const maxLength = Math.min(paletteValues.length, categories.length + 1);
    fallback = paletteValues[maxLength - 1];
    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: categories[i].key,
        style: paletteValues[i],
      });
    }
  }

  return {
    stops,
    fallback,
  };
}
