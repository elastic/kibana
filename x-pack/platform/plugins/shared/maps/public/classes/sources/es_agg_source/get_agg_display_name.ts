/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AGG_TYPE } from '../../../../common/constants';

export function getAggDisplayName(aggType: AGG_TYPE): string {
  switch (aggType) {
    case AGG_TYPE.AVG:
      return i18n.translate('xpack.maps.aggType.averageLabel', {
        defaultMessage: 'average',
      });
    case AGG_TYPE.COUNT:
      return i18n.translate('xpack.maps.aggType.countLabel', {
        defaultMessage: 'count',
      });
    case AGG_TYPE.MAX:
      return i18n.translate('xpack.maps.aggType.maximumLabel', {
        defaultMessage: 'max',
      });
    case AGG_TYPE.MIN:
      return i18n.translate('xpack.maps.aggType.minimumLabel', {
        defaultMessage: 'min',
      });
    case AGG_TYPE.PERCENTILE:
      return i18n.translate('xpack.maps.aggType.percentileLabel', {
        defaultMessage: 'percentile',
      });
    case AGG_TYPE.SUM:
      return i18n.translate('xpack.maps.aggType.sumLabel', {
        defaultMessage: 'sum',
      });
    case AGG_TYPE.TERMS:
      return i18n.translate('xpack.maps.aggType.topTermLabel', {
        defaultMessage: 'top term',
      });
    case AGG_TYPE.UNIQUE_COUNT:
      return i18n.translate('xpack.maps.aggType.cardinalityTermLabel', {
        defaultMessage: 'unique count',
      });
    default:
      return aggType;
  }
}
