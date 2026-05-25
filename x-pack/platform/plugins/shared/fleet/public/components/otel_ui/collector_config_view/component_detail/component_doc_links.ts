/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OTelComponentType } from '../graph_view/constants';

const OTEL_COMPONENT_DOC_URLS: Partial<Record<OTelComponentType, string>> = {
  receiver: 'https://opentelemetry.io/docs/collector/components/receiver/',
  processor: 'https://opentelemetry.io/docs/collector/components/processor/',
  exporter: 'https://opentelemetry.io/docs/collector/components/exporter/',
  connector: 'https://opentelemetry.io/docs/collector/components/connector/',
};

export const getComponentDocUrl = (componentType: OTelComponentType): string | undefined =>
  OTEL_COMPONENT_DOC_URLS[componentType];
