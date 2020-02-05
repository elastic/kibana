/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ES_SPATIAL_RELATIONS } from './constants';

export function getAppTitle() {
  return i18n.translate('xpack.maps.appTitle', {
    defaultMessage: 'Maps',
  });
}

export function getDataSourceLabel() {
  return i18n.translate('xpack.maps.source.dataSourceLabel', {
    defaultMessage: 'Data source',
  });
}

export function getUrlLabel() {
  return i18n.translate('xpack.maps.source.urlLabel', {
    defaultMessage: 'Url',
  });
}

export function getEsSpatialRelationLabel(spatialRelation) {
  switch (spatialRelation) {
    case ES_SPATIAL_RELATIONS.INTERSECTS:
      return i18n.translate('xpack.maps.common.esSpatialRelation.intersectsLabel', {
        defaultMessage: 'intersects',
      });
    case ES_SPATIAL_RELATIONS.DISJOINT:
      return i18n.translate('xpack.maps.common.esSpatialRelation.disjointLabel', {
        defaultMessage: 'disjoint',
      });
    case ES_SPATIAL_RELATIONS.WITHIN:
      return i18n.translate('xpack.maps.common.esSpatialRelation.withinLabel', {
        defaultMessage: 'within',
      });
    case ES_SPATIAL_RELATIONS.CONTAINS:
      return i18n.translate('xpack.maps.common.esSpatialRelation.containsLabel', {
        defaultMessage: 'contains',
      });
    default:
      return spatialRelation;
  }
}
