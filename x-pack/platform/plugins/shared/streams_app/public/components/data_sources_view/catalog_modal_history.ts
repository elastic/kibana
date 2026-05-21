/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CatalogModalHistoryEntry } from './catalog_modal_navigation';

export type CatalogModalView = 'browse' | 'aws-overview' | 'aws-setup';

const CATALOG_VIEW_HISTORY_META: Record<CatalogModalView, CatalogModalHistoryEntry> = {
  browse: {
    id: 'browse',
    title: i18n.translate('xpack.streams.dataSources.catalogModal.flyoutTitle', {
      defaultMessage: 'Add data to Elastic Observability',
    }),
  },
  'aws-overview': {
    id: 'aws-overview',
    title: i18n.translate('xpack.streams.dataSources.catalogModal.awsOverviewTitle', {
      defaultMessage: 'Amazon Web Services',
    }),
    iconType: 'logoAWS',
  },
  'aws-setup': {
    id: 'aws-setup',
    title: i18n.translate('xpack.streams.dataSources.catalogModal.awsSetupTitle', {
      defaultMessage: 'Add Amazon Web Services',
    }),
    iconType: 'logoAWS',
  },
};

export const getCatalogHistoryEntries = (
  viewHistory: readonly CatalogModalView[]
): CatalogModalHistoryEntry[] => viewHistory.map((view) => CATALOG_VIEW_HISTORY_META[view]);

export const getCatalogViewFromHistory = (
  viewHistory: readonly CatalogModalView[]
): CatalogModalView => viewHistory[viewHistory.length - 1] ?? 'browse';
