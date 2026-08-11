/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnRefreshChangeProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import { DEFAULT_DATASET_TYPE } from '../../common/constants';
import type { DataStreamType, QualityIndicators } from '../../common/types';
import { Integration } from '../../common/data_streams_stats/integration';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import type { IntegrationItem } from '../components/dataset_quality/filters/integrations_selector';
import type { NamespaceItem } from '../components/dataset_quality/filters/namespaces_selector';
import type { QualityItem } from '../components/dataset_quality/filters/qualities_selector';
import type { Item } from '../components/dataset_quality/filters/selector';

export const useDatasetQualityFilters = () => {
  const { service, isDatasetQualityAllSignalsAvailable } = useDatasetQualityContext();

  const isLoading = useSelector(
    service,
    (state) =>
      state.matches('initializing') ||
      (state.matches({ main: { integrations: 'fetching' } }) &&
        (state.matches({ main: { stats: { datasets: 'fetching' } } }) ||
          state.matches({ main: { stats: { degradedDocs: 'fetching' } } })))
  );

  const authorizedDatasetTypes = useSelector(service, (state) =>
    !state.matches('initializing') ? state.context.authorizedDatasetTypes : []
  );

  const {
    timeRange,
    integrations: selectedIntegrations,
    namespaces: selectedNamespaces,
    types: selectedTypes,
    qualities: selectedQualities,
    query: selectedQuery,
  } = useSelector(service, (state) => state.context.filters);

  interface Filters {
    namespaces: string[];
    qualities: QualityIndicators[];
    filteredIntegrations: string[];
  }

  const datasets = useSelector(service, (state) => state.context.datasets);
  const integrations = useSelector(service, (state) => state.context.integrations);
  const { namespaces, qualities, filteredIntegrations } = useMemo(
    () =>
      datasets.reduce(
        (acc: Filters, dataset) => ({
          namespaces: [...new Set([...acc.namespaces, dataset.namespace])],
          qualities: [...new Set([...acc.qualities, dataset.quality])],
          filteredIntegrations: [
            ...new Set([...acc.filteredIntegrations, dataset.integration?.name ?? 'none']),
          ],
        }),
        { namespaces: [], qualities: [], filteredIntegrations: [] }
      ),
    [datasets]
  );

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string }) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          from: selectedTime.start,
          to: selectedTime.end,
        },
      });
    },
    [service, timeRange]
  );

  const onRefresh = useCallback(() => {
    service.send({
      type: 'REFRESH_DATA',
    });
  }, [service]);

  const onRefreshChange = useCallback(
    ({ refreshInterval, isPaused }: Pick<OnRefreshChangeProps, 'refreshInterval' | 'isPaused'>) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          refresh: {
            pause: isPaused,
            value: refreshInterval,
          },
        },
      });
    },
    [service, timeRange]
  );

  const integrationItems: IntegrationItem[] = useMemo(() => {
    const integrationsMap =
      integrations?.reduce(
        (acc, integration) => ({
          ...acc,
          [integration.name]: integration,
        }),
        {} as { [key: string]: Integration }
      ) ?? {};

    integrationsMap.none = Integration.create({ name: 'none', title: 'None' });

    return filteredIntegrations.map((name) => ({
      ...integrationsMap[name],
      label: integrationsMap[name]?.title,
      checked: selectedIntegrations.includes(name) ? 'on' : undefined,
    }));
  }, [integrations, filteredIntegrations, selectedIntegrations]);

  const onIntegrationsChange = useCallback(
    (newIntegrationItems: IntegrationItem[]) => {
      service.send({
        type: 'UPDATE_INTEGRATIONS',
        integrations: newIntegrationItems
          .filter((integration) => integration.checked === 'on')
          .map((integration) => integration.name),
      });
    },
    [service]
  );

  const namespaceItems: NamespaceItem[] = useMemo(() => {
    const uniqueNamespaces = [...new Set(namespaces)];

    return uniqueNamespaces.map((namespace) => ({
      label: namespace,
      checked: selectedNamespaces.includes(namespace) ? 'on' : undefined,
    }));
  }, [namespaces, selectedNamespaces]);

  const onNamespacesChange = useCallback(
    (newNamespaceItems: NamespaceItem[]) => {
      service.send({
        type: 'UPDATE_NAMESPACES',
        namespaces: newNamespaceItems
          .filter((namespace) => namespace.checked === 'on')
          .map((namespace) => namespace.label),
      });
    },
    [service]
  );

  const qualityItems: QualityItem[] = useMemo(() => {
    const uniqueQualities = [...new Set(qualities)];

    return uniqueQualities.map((quality) => ({
      label: quality,
      checked: selectedQualities.includes(quality) ? 'on' : undefined,
    }));
  }, [qualities, selectedQualities]);

  const onQualitiesChange = useCallback(
    (newQualityItems: QualityItem[]) => {
      service.send({
        type: 'UPDATE_QUALITIES',
        qualities: newQualityItems
          .filter((quality) => quality.checked === 'on')
          .map((quality) => quality.label),
      });
    },
    [service]
  );

  const typeItems: Item[] = useMemo(() => {
    const validTypeItems = isDatasetQualityAllSignalsAvailable
      ? authorizedDatasetTypes
      : [DEFAULT_DATASET_TYPE];

    return validTypeItems.map((type) => ({
      label: type,
      checked: selectedTypes.includes(type) ? 'on' : undefined,
    }));
  }, [authorizedDatasetTypes, isDatasetQualityAllSignalsAvailable, selectedTypes]);

  const onTypesChange = useCallback(
    (newTypeItems: Item[]) => {
      service.send({
        type: 'UPDATE_TYPES',
        types: newTypeItems
          .filter((quality) => quality.checked === 'on')
          .map((type) => type.label as DataStreamType),
      });
    },
    [service]
  );

  const onQueryChange = useCallback(
    (query: string) => {
      service.send({
        type: 'UPDATE_QUERY',
        query,
      });
    },
    [service]
  );

  return {
    timeRange,
    onTimeChange,
    onRefresh,
    onRefreshChange,
    integrations: integrationItems,
    namespaces: namespaceItems,
    qualities: qualityItems,
    types: typeItems,
    authorizedDatasetTypes,
    onIntegrationsChange,
    onNamespacesChange,
    onQualitiesChange,
    onTypesChange,
    isLoading,
    selectedQuery,
    onQueryChange,
    isDatasetQualityAllSignalsAvailable,
  };
};
