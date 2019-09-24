/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CPUUsage,
  MemoryUsage,
  InboundTraffic,
  OutboundTraffic,
  fieldToName,
} from '../intl_strings';
import { InfraSnapshotMetricType } from '../../graphql/types';
import { InventoryToolbar } from '../types';

export const toolbar: InventoryToolbar = [
  {
    type: 'metric',
    options: [
      {
        text: CPUUsage,
        value: InfraSnapshotMetricType.cpu,
      },
      {
        text: MemoryUsage,
        value: InfraSnapshotMetricType.memory,
      },
      {
        text: InboundTraffic,
        value: InfraSnapshotMetricType.rx,
      },
      {
        text: OutboundTraffic,
        value: InfraSnapshotMetricType.tx,
      },
    ],
  },
  {
    type: 'groupBy',
    options: [
      'cloud.availability_zone',
      'cloud.machine.type',
      'cloud.project.id',
      'cloud.provider',
      'service.type',
    ].map(field => ({ text: fieldToName(field), value: field })),
  },
];
