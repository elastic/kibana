/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import type { AiIndexDest } from '../../../../common/http_api/ai_indices';

const noneValueLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.noneValue', {
  defaultMessage: 'None',
});

export type KiListTypeFilter = { kind: 'all'; value: 'all' } | { kind: 'type'; value: string };
export const ALL_TYPE_FILTER: KiListTypeFilter = { kind: 'all', value: 'all' };

export const getDiscoverEsqlQuery = (destValue: string): string => `FROM ${destValue} | LIMIT 100`;

export const getIndexManagementLocatorParams = (
  dest: AiIndexDest
): IndexManagementLocatorParams => {
  if (dest.type === 'data_stream') {
    return { page: 'data_streams_details', dataStreamName: dest.value };
  }

  return { page: 'index_details', indexName: dest.value };
};

export const capitalizeLabel = (label: string): string =>
  label.length > 0 ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;

export const getKiTypeLabel = (type: string): string => type.replace(/_/g, ' ');

export const getKiListTypeFilterLabel = (type: string): string =>
  type === ALL_TYPE_FILTER.value
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.filterAll', {
        defaultMessage: 'All',
      })
    : getKiTypeLabel(type);

export const getKiDisplayTitle = (title?: string): string => title ?? noneValueLabel;

export const getKiDisplayTypeLabel = (type?: string): string =>
  capitalizeLabel(getKiTypeLabel(type ?? noneValueLabel));
