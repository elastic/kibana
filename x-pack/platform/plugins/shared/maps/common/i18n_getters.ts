/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeoShapeRelation } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';

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

export function getEsSpatialRelationLabel(spatialRelation: GeoShapeRelation) {
  switch (spatialRelation) {
    case 'intersects':
      return i18n.translate('xpack.maps.common.esSpatialRelation.intersectsLabel', {
        defaultMessage: 'intersects',
      });
    case 'disjoint':
      return i18n.translate('xpack.maps.common.esSpatialRelation.disjointLabel', {
        defaultMessage: 'disjoint',
      });
    case 'within':
      return i18n.translate('xpack.maps.common.esSpatialRelation.withinLabel', {
        defaultMessage: 'within',
      });
    case 'contains':
      return i18n.translate('xpack.maps.common.esSpatialRelation.containsLabel', {
        defaultMessage: 'contains',
      });
    default:
      return spatialRelation;
  }
}

export function getDataViewLabel() {
  return i18n.translate('xpack.maps.dataView.label', {
    defaultMessage: 'Data view',
  });
}

export function getDataViewSelectPlaceholder() {
  return i18n.translate('xpack.maps.dataView.selectPlacholder', {
    defaultMessage: 'Select data view',
  });
}

export function getDataViewNotFoundMessage(id: string) {
  return i18n.translate('xpack.maps.dataView.notFoundMessage', {
    defaultMessage: `Unable to find data view ''{id}''`,
    values: { id },
  });
}
