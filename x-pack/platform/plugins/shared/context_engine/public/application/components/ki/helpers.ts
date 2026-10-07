/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import type { KiLifecycleStatus } from '../../../../common/step_types/ki';
import type { AiIndexDest } from '../../../../common/http_api/ai_indices';

export const noneValueLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.noneValue', {
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

const getMemoryKiTypeLabel = (type: string): string | undefined => {
  switch (type) {
    case 'memory.session':
      return i18n.translate('xpack.contextEngine.kiType.memorySession', {
        defaultMessage: 'Session summary',
      });
    case 'memory.session_fact':
      return i18n.translate('xpack.contextEngine.kiType.memorySessionFact', {
        defaultMessage: 'Session fact',
      });
    default:
      return undefined;
  }
};

export const getKiTypeLabel = (type: string): string => {
  const memoryLabel = getMemoryKiTypeLabel(type);
  if (memoryLabel !== undefined) {
    return memoryLabel;
  }

  const leafType = type.includes('.') ? type.slice(type.lastIndexOf('.') + 1) : type;
  return leafType.replace(/_/g, ' ');
};

export const getKiListTypeFilterLabel = (type: string): string =>
  type === ALL_TYPE_FILTER.value
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.filterAll', {
        defaultMessage: 'All',
      })
    : getKiTypeLabel(type);

export const getKiDisplayTitle = (title?: string): string => title ?? noneValueLabel;

export const getKiDisplayTypeLabel = (type?: string): string =>
  capitalizeLabel(getKiTypeLabel(type ?? noneValueLabel));

export const normalizeKiLifecycleStatus = (
  lifecycleStatus?: KiLifecycleStatus
): KiLifecycleStatus => (lifecycleStatus === 'deleted' ? 'deleted' : 'active');

export const getKiLifecycleStatusLabel = (lifecycleStatus: KiLifecycleStatus): string => {
  switch (lifecycleStatus) {
    case 'deleted':
      return i18n.translate('xpack.contextEngine.kiLifecycleStatus.deleted', {
        defaultMessage: 'Deleted',
      });
    case 'active':
      return i18n.translate('xpack.contextEngine.kiLifecycleStatus.active', {
        defaultMessage: 'Active',
      });
  }
};
