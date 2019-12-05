/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


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

  if (!hasFeatureType) {
    return false;
  }

  const featureTypes = Object.keys(hasFeatureType);
  return featureTypes.reduce((isOnlyTargetFeatureType, featureTypeKey) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType
      ? isOnlyTargetFeatureType && hasFeature
      : isOnlyTargetFeatureType && !hasFeature;
  }, true);
}
