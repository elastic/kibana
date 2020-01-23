/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostK8sOverview: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostK8sOverview',
  requires: ['kubernetes'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'cpucap',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.node.cpu.allocatable.cores',
          id: 'max-cpu-cap',
          type: 'max',
        },
        {
          field: 'kubernetes.node.cpu.usage.nanocores',
          id: 'avg-cpu-usage',
          type: 'avg',
        },
        {
          id: 'calc-used-cap',
          script: 'params.used / (params.cap * 1000000000)',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cap',
              id: 'var-cap',
              name: 'cap',
            },
            {
              field: 'avg-cpu-usage',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
    },
    {
      id: 'diskcap',
      metrics: [
        {
          field: 'kubernetes.node.fs.capacity.bytes',
          id: 'max-fs-cap',
          type: 'max',
        },
        {
          field: 'kubernetes.node.fs.used.bytes',
          id: 'avg-fs-used',
          type: 'avg',
        },
        {
          id: 'calc-used-cap',
          script: 'params.used / params.cap',
          type: 'calculation',
          variables: [
            {
              field: 'max-fs-cap',
              id: 'var-cap',
              name: 'cap',
            },
            {
              field: 'avg-fs-used',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'memorycap',
      metrics: [
        {
          field: 'kubernetes.node.memory.allocatable.bytes',
          id: 'max-memory-cap',
          type: 'max',
        },
        {
          field: 'kubernetes.node.memory.usage.bytes',
          id: 'avg-memory-usage',
          type: 'avg',
        },
        {
          id: 'calc-used-cap',
          script: 'params.used / params.cap',
          type: 'calculation',
          variables: [
            {
              field: 'max-memory-cap',
              id: 'var-cap',
              name: 'cap',
            },
            {
              field: 'avg-memory-usage',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'podcap',
      metrics: [
        {
          field: 'kubernetes.node.pod.capacity.total',
          id: 'max-pod-cap',
          type: 'max',
        },
        {
          field: 'kubernetes.pod.uid',
          id: 'card-pod-name',
          type: 'cardinality',
        },
        {
          id: 'calc-used-cap',
          script: 'params.used / params.cap',
          type: 'calculation',
          variables: [
            {
              field: 'max-pod-cap',
              id: 'var-cap',
              name: 'cap',
            },
            {
              field: 'card-pod-name',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
