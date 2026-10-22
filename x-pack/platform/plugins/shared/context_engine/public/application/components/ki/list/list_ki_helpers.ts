/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import type { AiIndexDest } from '../../../../../common/http_api/ai_indices';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { formatKiTypeLabel, noneValueLabel } from '../../../utils/ki_display';

export type ListKiTypeFilter = { kind: 'all'; value: 'all' } | { kind: 'type'; value: string };
export const ALL_TYPE_FILTER: ListKiTypeFilter = { kind: 'all', value: 'all' };

export const getDiscoverEsqlQuery = (destValue: string): string => `FROM ${destValue} | LIMIT 100`;

export const getIndexManagementLocatorParams = (
  dest: AiIndexDest
): IndexManagementLocatorParams => {
  if (dest.type === 'data_stream') {
    return { page: 'data_streams_details', dataStreamName: dest.value };
  }

  return { page: 'index_details', indexName: dest.value };
};

export const getListKiTypeFilterLabel = (type: string): string =>
  type === ALL_TYPE_FILTER.value
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.filterAll', {
        defaultMessage: 'All',
      })
    : formatKiTypeLabel(type);

export const getListKiStatusFilterLabel = (status: KiLifecycleStatus): string => {
  switch (status) {
    case 'active':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusActive', {
        defaultMessage: 'Active',
      });
    case 'deleted':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusDeleted', {
        defaultMessage: 'Deleted',
      });
    case 'verification_failed':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.statusVerificationFailed', {
        defaultMessage: 'Failed',
      });
  }
};

export const getKiDisplayTitle = (title?: string): string =>
  title !== undefined && title.length > 0 ? title : noneValueLabel;
