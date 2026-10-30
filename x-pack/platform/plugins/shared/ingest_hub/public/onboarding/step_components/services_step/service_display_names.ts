/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

import { SIGNAL_TYPE_LABELS } from './signal_type_badge';

/**
 * Display name of each service by id, as the Services step shows it: the service name, followed
 * by its signal types (`AWS EC2 Logs`, `AWS EC2 Metrics`) when other services of the same data
 * format share the name.
 */
export function getServiceDisplayNames(matrix: AwsServiceMatrixEntry[]): Map<string, string> {
  const formatAndName = (service: AwsServiceMatrixEntry) =>
    `${service.dataFormat ?? 'ecs'}|${service.name}`;

  const counts = new Map<string, number>();
  for (const service of matrix) {
    if (service.showInUI)
      counts.set(formatAndName(service), (counts.get(formatAndName(service)) ?? 0) + 1);
  }

  return new Map(
    matrix.map((service) => [
      service.id,
      (counts.get(formatAndName(service)) ?? 0) > 1
        ? `${service.name} ${service.signalTypes.map((t) => SIGNAL_TYPE_LABELS[t]).join(' & ')}`
        : service.name,
    ])
  );
}
