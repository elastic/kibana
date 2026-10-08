/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import {
  SEED_DATA_API_PATH,
  SEED_DATA_ECOMMERCE_ID,
  SEED_DATA_FLIGHTS_ID,
  SEED_DATA_KUBERNETES_ID,
  type SeedDataSetId,
} from '../../common/seed_data/constants';

export interface SeedCard {
  id: SeedDataSetId;
  title: string;
  description: string;
  dashboardHint: string;
}

export const SEED_DATA_CARDS: SeedCard[] = [
  {
    id: SEED_DATA_FLIGHTS_ID,
    title: i18n.translate('xpack.agentBuilderDashboards.seedData.flights.title', {
      defaultMessage: 'Sample flight data',
    }),
    description: i18n.translate('xpack.agentBuilderDashboards.seedData.flights.description', {
      defaultMessage:
        'Installs flight sample data, data view, visualizations, and the Global Flight Dashboard.',
    }),
    dashboardHint: '[Flights] Global Flight Dashboard',
  },
  {
    id: SEED_DATA_ECOMMERCE_ID,
    title: i18n.translate('xpack.agentBuilderDashboards.seedData.ecommerce.title', {
      defaultMessage: 'Sample eCommerce data',
    }),
    description: i18n.translate('xpack.agentBuilderDashboards.seedData.ecommerce.description', {
      defaultMessage:
        'Installs eCommerce sample data, data view, visualizations, and the Revenue Dashboard.',
    }),
    dashboardHint: '[eCommerce] Revenue Dashboard',
  },
  {
    id: SEED_DATA_KUBERNETES_ID,
    title: i18n.translate('xpack.agentBuilderDashboards.seedData.kubernetes.title', {
      defaultMessage: 'Kubernetes (OTel)',
    }),
    description: i18n.translate('xpack.agentBuilderDashboards.seedData.kubernetes.description', {
      defaultMessage:
        'Installs the kubernetes_otel Fleet package (managed dashboards) and seeds 24h of OTel Kubernetes metrics.',
    }),
    dashboardHint: '[Kubernetes OTel] Overview',
  },
];

/** Seeds one dataset (data + dashboards) and returns a short success message. */
export async function seedDataset(http: CoreStart['http'], id: SeedDataSetId): Promise<string> {
  if (id === SEED_DATA_KUBERNETES_ID) {
    const result = await http.post<{
      documentsIndexed: number;
      dataStreams: string[];
      packageInstalled?: boolean;
      packageName?: string;
    }>(`${SEED_DATA_API_PATH}/${SEED_DATA_KUBERNETES_ID}`, { body: '{}' });

    if (result.packageInstalled) {
      return i18n.translate('xpack.agentBuilderDashboards.seedData.kubernetes.successWithPackage', {
        defaultMessage:
          'Installed {packageName} dashboards and indexed {count} metric docs into {streams}.',
        values: {
          packageName: result.packageName ?? 'kubernetes_otel',
          count: result.documentsIndexed,
          streams: result.dataStreams.join(', '),
        },
      });
    }

    return i18n.translate('xpack.agentBuilderDashboards.seedData.kubernetes.success', {
      defaultMessage: 'Indexed {count} docs into {streams}.',
      values: {
        count: result.documentsIndexed,
        streams: result.dataStreams.join(', '),
      },
    });
  }

  // Home sample-data installer creates indices + dashboards + visualizations.
  const result = await http.post<{
    elasticsearchIndicesCreated?: Record<string, number>;
    kibanaSavedObjectsLoaded?: number;
  }>(`/api/sample_data/${id}`, { body: '{}' });

  const docs = Object.values(result.elasticsearchIndicesCreated ?? {}).reduce(
    (sum, n) => sum + n,
    0
  );
  return i18n.translate('xpack.agentBuilderDashboards.seedData.sample.success', {
    defaultMessage:
      'Installed sample data and dashboards ({docs} docs, {objects} saved objects including dashboards).',
    values: {
      docs,
      objects: result.kibanaSavedObjectsLoaded ?? 0,
    },
  });
}

export function getSeedErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'body' in error &&
    error.body &&
    typeof error.body === 'object' &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return error.body.message;
  }
  return error instanceof Error ? error.message : String(error);
}
