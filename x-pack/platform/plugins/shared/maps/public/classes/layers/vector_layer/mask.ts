/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import type { IESAggSource } from '../../sources/es_agg_source';
import type { IESAggField } from '../../fields/agg';
import { FIELD_ORIGIN, MASK_OPERATOR, MB_LOOKUP_FUNCTION } from '../../../../common/constants';

export const BELOW = i18n.translate('xpack.maps.mask.belowLabel', {
  defaultMessage: 'below',
});

export const ABOVE = i18n.translate('xpack.maps.mask.aboveLabel', {
  defaultMessage: 'above',
});

export const BUCKETS = i18n.translate('xpack.maps.mask.genericBucketsName', {
  defaultMessage: 'buckets',
});

const FEATURES = i18n.translate('xpack.maps.mask.genericFeaturesName', {
  defaultMessage: 'features',
});

const VALUE = i18n.translate('xpack.maps.mask.genericAggLabel', {
  defaultMessage: 'value',
});

const WHEN = i18n.translate('xpack.maps.mask.when', {
  defaultMessage: 'when',
});

const WHEN_JOIN_METRIC = i18n.translate('xpack.maps.mask.whenJoinMetric', {
  defaultMessage: '{whenLabel} join metric',
  values: {
    whenLabel: WHEN,
  },
});

function getOperatorLabel(operator: MASK_OPERATOR): string {
  if (operator === MASK_OPERATOR.BELOW) {
    return BELOW;
  }

  if (operator === MASK_OPERATOR.ABOVE) {
    return ABOVE;
  }

  return operator as string;
}

export function getMaskI18nValue(operator: MASK_OPERATOR, value: number): string {
  return `${getOperatorLabel(operator)} ${value}`;
}

export function getMaskI18nLabel({
  bucketsName,
  isJoin,
}: {
  bucketsName?: string;
  isJoin: boolean;
}): string {
  return i18n.translate('xpack.maps.mask.maskLabel', {
    defaultMessage: 'Hide {hideNoun}',
    values: {
      hideNoun: isJoin ? FEATURES : bucketsName ? bucketsName : BUCKETS,
    },
  });
}

export function getMaskI18nDescription({
  aggLabel,
  bucketsName,
  isJoin,
}: {
  aggLabel?: string;
  bucketsName?: string;
  isJoin: boolean;
}): string {
  return i18n.translate('xpack.maps.mask.maskDescription', {
    defaultMessage: '{maskAdverb} {aggLabel} is ',
    values: {
      aggLabel: aggLabel ? aggLabel : VALUE,
      maskAdverb: isJoin ? WHEN_JOIN_METRIC : WHEN,
    },
  });
}

export class Mask {
  private readonly _esAggField: IESAggField;
  private readonly _isGeometrySourceMvt: boolean;
  private readonly _operator: MASK_OPERATOR;
  private readonly _value: number;

  constructor({
    esAggField,
    isGeometrySourceMvt,
    operator,
    value,
  }: {
    esAggField: IESAggField;
    isGeometrySourceMvt: boolean;
    operator: MASK_OPERATOR;
    value: number;
  }) {
    this._esAggField = esAggField;
    this._isGeometrySourceMvt = isGeometrySourceMvt;
    this._operator = operator;
    this._value = value;
  }

  private _isFeatureState() {
    if (this._esAggField.getOrigin() === FIELD_ORIGIN.SOURCE) {
      // source fields are stored in properties
      return false;
    }

    if (!this._isGeometrySourceMvt) {
      // For geojson sources, join fields are stored in properties
      return false;
    }

    // For vector tile sources, it is not possible to add join fields to properties
    // so join fields are stored in feature state
    return true;
  }

  /*
   * Returns maplibre expression that matches masked features
   */
  getMatchMaskedExpression() {
    const comparisionOperator = this._operator === MASK_OPERATOR.BELOW ? '<' : '>';
    const lookup = this._isFeatureState()
      ? MB_LOOKUP_FUNCTION.FEATURE_STATE
      : MB_LOOKUP_FUNCTION.GET;
    return [comparisionOperator, [lookup, this._esAggField.getMbFieldName()], this._value];
  }

  /*
   * Returns maplibre expression that matches unmasked features
   */
  getMatchUnmaskedExpression() {
    const comparisionOperator = this._operator === MASK_OPERATOR.BELOW ? '>=' : '<=';
    const lookup = this._isFeatureState()
      ? MB_LOOKUP_FUNCTION.FEATURE_STATE
      : MB_LOOKUP_FUNCTION.GET;
    return [comparisionOperator, [lookup, this._esAggField.getMbFieldName()], this._value];
  }

  getEsAggField() {
    return this._esAggField;
  }

  getFieldOriginListLabel() {
    const source = this._esAggField.getSource();
    const isJoin = this._esAggField.getOrigin() === FIELD_ORIGIN.JOIN;
    const maskLabel = getMaskI18nLabel({
      bucketsName:
        'getBucketsName' in (source as IESAggSource)
          ? (source as IESAggSource).getBucketsName()
          : undefined,
      isJoin,
    });
    const adverb = isJoin ? WHEN_JOIN_METRIC : WHEN;

    return `${maskLabel} ${adverb}`;
  }

  getOperator() {
    return this._operator;
  }

  getValue() {
    return this._value;
  }

  isFeatureMasked(feature: MapGeoJSONFeature) {
    const featureValue = this._isFeatureState()
      ? feature?.state[this._esAggField.getMbFieldName()]
      : feature?.properties[this._esAggField.getMbFieldName()];
    if (typeof featureValue !== 'number') {
      return false;
    }
    return this._operator === MASK_OPERATOR.BELOW
      ? featureValue < this._value
      : featureValue > this._value;
  }
}
