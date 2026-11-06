/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `dynamic` block of the built-in `host`: how the inventory lists hosts live from telemetry.
 * Two tiers of sources. Wide, metric-less existence sources list a host seen in any integration's
 * metrics. Narrow host telemetry sources supply the attributes. Column names follow the
 * OpenTelemetry semantic conventions where one exists; ECS-only fields keep their ECS name. A
 * starting point, expected to change as the inventory is built out.
 */

import type { DynamicBlock } from './dynamic_block_schema';

export const hostDynamicBlock: DynamicBlock = {
  sources: [
    // Existence tier: wide and metric-less. A host seen in any integration's metrics, ECS or
    // OTel, is listed, with no attributes from this source. Runs under FROM where a standard-mode
    // index is in the pattern (kubernetes.event), which costs nothing for existence.
    {
      indexPattern: 'metrics-*-*',
    },
    // Attribute tier: narrow host telemetry sources. Column names follow OTel semconv; each
    // source reads its own field. Fields a pipeline only emits when configured (the system
    // resource detector, cloud detectors, cluster name injection) are declared anyway: absent
    // means a null column, present means the column fills in.
    {
      indexPattern: 'metrics-hostmetricsreceiver.otel-*',
      attributes: [
        { name: 'os.type', field: 'os.type' },
        { name: 'os.version', field: 'os.version' },
        { name: 'host.arch', field: 'host.arch' },
        { name: 'host.ip', field: 'host.ip' },
        { name: 'k8s.cluster.name', field: 'k8s.cluster.name' },
        { name: 'cloud.provider', field: 'cloud.provider' },
        { name: 'cloud.platform', field: 'cloud.platform' },
        { name: 'cloud.region', field: 'cloud.region' },
        { name: 'cloud.availability_zone', field: 'cloud.availability_zone' },
        { name: 'cloud.account.id', field: 'cloud.account.id' },
      ],
    },
    {
      indexPattern: 'metrics-system.*-*',
      attributes: [
        { name: 'os.type', field: 'host.os.type' },
        { name: 'os.name', field: 'host.os.name' },
        { name: 'os.version', field: 'host.os.version' },
        { name: 'host.os.kernel', field: 'host.os.kernel' },
        { name: 'host.arch', field: 'host.architecture', valueLabels: { aarch64: 'arm64' } },
        { name: 'host.ip', field: 'host.ip' },
        { name: 'cloud.provider', field: 'cloud.provider' },
        { name: 'cloud.platform', field: 'cloud.platform' },
        { name: 'cloud.region', field: 'cloud.region' },
        { name: 'cloud.availability_zone', field: 'cloud.availability_zone' },
        { name: 'cloud.account.id', field: 'cloud.account.id' },
      ],
    },
    // The system integration has no cluster concept; the kubernetes integration stamps the
    // cluster on its node metrics, whose host.name is the node.
    {
      indexPattern: 'metrics-kubernetes.node-*',
      attributes: [{ name: 'k8s.cluster.name', field: 'orchestrator.cluster.name' }],
    },
  ],
};
