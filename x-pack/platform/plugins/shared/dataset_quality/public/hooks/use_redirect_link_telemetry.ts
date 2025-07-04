/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { AggregateQuery, Query } from '@kbn/es-query';
import { NavigationSource } from '../services/telemetry';
import { useDatasetTelemetry } from './use_dataset_telemetry';
import { useDatasetDetailsTelemetry } from './use_dataset_details_telemetry';

export type SendTelemetryFn =
  | ReturnType<typeof useDatasetRedirectLinkTelemetry>['sendTelemetry']
  | ReturnType<typeof useDatasetDetailsRedirectLinkTelemetry>['sendTelemetry'];

export const useDatasetRedirectLinkTelemetry = ({
  rawName,
  query,
}: {
  rawName: string;
  query?: Query | AggregateQuery;
}) => {
  const { trackDatasetNavigated } = useDatasetTelemetry();

  const sendTelemetry = useCallback(() => {
    const isIgnoredFilter = query ? JSON.stringify(query).includes('_ignored') : false;

    trackDatasetNavigated(rawName, isIgnoredFilter);
  }, [query, rawName, trackDatasetNavigated]);

  return {
    sendTelemetry,
  };
};

export const useDatasetDetailsRedirectLinkTelemetry = ({
  query,
  navigationSource,
}: {
  navigationSource: NavigationSource;
  query?: Query | AggregateQuery;
}) => {
  const { trackDetailsNavigated, navigationTargets } = useDatasetDetailsTelemetry();

  const sendTelemetry = useCallback(() => {
    const isIgnoredFilter = query ? JSON.stringify(query).includes('_ignored') : false;

    trackDetailsNavigated(navigationTargets.Discover, navigationSource, isIgnoredFilter);
  }, [query, navigationTargets.Discover, trackDetailsNavigated, navigationSource]);

  return {
    sendTelemetry,
  };
};
