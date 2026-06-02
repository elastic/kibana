/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pre-built graph-stream topologies for the PoC demo.
 * Each preset bundles the topology DSL (v0.1 edge-list format) with a
 * representative sample document that routes to a non-trivial destination,
 * making the demo interesting on first click.
 */

export interface GraphDslEdge {
  from: string;
  to: string;
  where?: Record<string, unknown>;
}

export interface GraphDsl {
  name: string;
  sources?: Record<string, { type: string }>;
  pipelines?: Record<string, { steps: unknown[] }>;
  destinations?: Record<string, { type: string; lifecycle?: Record<string, unknown> }>;
  routing: GraphDslEdge[];
}

export interface GraphPreset {
  id: string;
  label: string;
  description: string;
  topology: GraphDsl;
  /** ID of the entry source node (where the sample doc is submitted). */
  entrySource: string;
  sampleDocument: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Kubernetes application logs
// ---------------------------------------------------------------------------
const k8sTopology: GraphDsl = {
  name: 'k8s-logs-topology',
  sources: {
    k8s_otlp_in: { type: 'otlp' },
  },
  pipelines: {
    k8s_enrich: {
      steps: [
        {
          action: 'grok',
          from: 'body.message',
          patterns: [
            '%{TIMESTAMP_ISO8601:attributes.ts} %{LOGLEVEL:attributes.level} %{GREEDYDATA:attributes.msg}',
          ],
        },
        {
          action: 'set',
          field: 'attributes.k8s.cluster',
          value: 'prod-us-east-1',
        },
      ],
    },
  },
  destinations: {
    k8s_system_logs: { type: 'elasticsearch' },
    k8s_platform_logs: { type: 'elasticsearch' },
    k8s_app_logs: { type: 'elasticsearch' },
  },
  routing: [
    {
      from: 'k8s_otlp_in',
      to: 'k8s_enrich',
      where: { field: 'resource.attributes.k8s.namespace.name', exists: true },
    },
    {
      from: 'k8s_enrich',
      to: 'k8s_system_logs',
      where: { field: 'resource.attributes.k8s.namespace.name', eq: 'kube-system' },
    },
    {
      from: 'k8s_enrich',
      to: 'k8s_platform_logs',
      where: {
        or: [
          { field: 'resource.attributes.k8s.namespace.name', eq: 'monitoring' },
          { field: 'resource.attributes.k8s.namespace.name', eq: 'ingress-nginx' },
        ],
      },
    },
    { from: 'k8s_enrich', to: 'k8s_app_logs' },
  ],
};

// ---------------------------------------------------------------------------
// E-commerce payment processing
// ---------------------------------------------------------------------------
const ecommerceTopology: GraphDsl = {
  name: 'ecommerce-topology',
  sources: {
    orders_otlp_in: { type: 'otlp' },
  },
  pipelines: {
    orders_parse: {
      steps: [
        {
          action: 'set',
          field: 'attributes.env',
          value: 'production',
        },
      ],
    },
    payment_enrich: {
      steps: [
        {
          action: 'set',
          field: 'attributes.pci_scope',
          value: 'true',
        },
      ],
    },
  },
  destinations: {
    payment_pci_logs: {
      type: 'elasticsearch',
      lifecycle: { dsl: { data_retention: '365d' } },
    },
    fulfillment_logs: { type: 'elasticsearch' },
    orders_app_logs: { type: 'elasticsearch' },
  },
  routing: [
    {
      from: 'orders_otlp_in',
      to: 'orders_parse',
      where: { field: 'resource.attributes.service.name', eq: 'orders-service' },
    },
    {
      from: 'orders_parse',
      to: 'payment_enrich',
      where: { field: 'attributes.event_type', eq: 'payment' },
    },
    {
      from: 'orders_parse',
      to: 'fulfillment_logs',
      where: { field: 'attributes.event_type', eq: 'fulfillment' },
    },
    { from: 'orders_parse', to: 'orders_app_logs' },
    { from: 'payment_enrich', to: 'payment_pci_logs' },
  ],
};

// ---------------------------------------------------------------------------
// Multi-vendor firewall / security telemetry
// ---------------------------------------------------------------------------
const firewallTopology: GraphDsl = {
  name: 'firewall-topology',
  sources: {
    firewall_syslog_in: { type: 'async_bulk' },
  },
  pipelines: {
    paloalto_parse: {
      steps: [
        {
          action: 'set',
          field: 'attributes.vendor_name',
          value: 'paloalto',
        },
      ],
    },
    checkpoint_parse: {
      steps: [
        {
          action: 'set',
          field: 'attributes.vendor_name',
          value: 'checkpoint',
        },
      ],
    },
    fortinet_parse: {
      steps: [
        {
          action: 'set',
          field: 'attributes.vendor_name',
          value: 'fortinet',
        },
      ],
    },
  },
  destinations: {
    paloalto_firewall_logs: { type: 'elasticsearch' },
    checkpoint_firewall_logs: { type: 'elasticsearch' },
    fortinet_firewall_logs: { type: 'elasticsearch' },
    siem_high_severity_alerts: {
      type: 'elasticsearch',
      lifecycle: { dsl: { data_retention: '2y' } },
    },
  },
  routing: [
    {
      from: 'firewall_syslog_in',
      to: 'paloalto_parse',
      where: { field: 'resource.attributes.vendor', eq: 'paloalto' },
    },
    {
      from: 'firewall_syslog_in',
      to: 'checkpoint_parse',
      where: { field: 'resource.attributes.vendor', eq: 'checkpoint' },
    },
    {
      from: 'firewall_syslog_in',
      to: 'fortinet_parse',
      where: { field: 'resource.attributes.vendor', eq: 'fortinet' },
    },
    {
      from: 'paloalto_parse',
      to: 'siem_high_severity_alerts',
      where: { field: 'attributes.severity', eq: 'critical' },
    },
    { from: 'paloalto_parse', to: 'paloalto_firewall_logs' },
    {
      from: 'checkpoint_parse',
      to: 'siem_high_severity_alerts',
      where: { field: 'attributes.severity', eq: 'critical' },
    },
    { from: 'checkpoint_parse', to: 'checkpoint_firewall_logs' },
    {
      from: 'fortinet_parse',
      to: 'siem_high_severity_alerts',
      where: { field: 'attributes.severity', eq: 'critical' },
    },
    { from: 'fortinet_parse', to: 'fortinet_firewall_logs' },
  ],
};

// ---------------------------------------------------------------------------
// Exported preset list
// ---------------------------------------------------------------------------
export const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: 'k8s-logs',
    label: 'Kubernetes application logs',
    description:
      'Routes logs from multiple Kubernetes namespaces to system, platform, and app indices. ' +
      'Non-Kubernetes docs are retained in the intake stream.',
    topology: k8sTopology,
    entrySource: 'k8s_otlp_in',
    sampleDocument: {
      '@timestamp': '2026-06-02T10:00:00Z',
      'body.message': '2026-06-02T10:00:00Z INFO Pod started successfully',
      'resource.attributes.k8s.namespace.name': 'monitoring',
      'resource.attributes.k8s.pod.name': 'prometheus-0',
      'resource.attributes.service.name': 'prometheus',
    },
  },
  {
    id: 'ecommerce',
    label: 'E-commerce payment processing',
    description:
      'Routes order-service events to PCI-scoped, fulfillment, or general-app indices. ' +
      'Payment events go through a redaction pipeline before landing in the PCI index (365-day retention).',
    topology: ecommerceTopology,
    entrySource: 'orders_otlp_in',
    sampleDocument: {
      '@timestamp': '2026-06-02T10:00:00Z',
      'resource.attributes.service.name': 'orders-service',
      'attributes.event_type': 'payment',
      'attributes.order_id': 'ord-9182',
      'attributes.amount': 149.99,
      'attributes.card_number': '4111-1111-1111-1111',
    },
  },
  {
    id: 'firewall',
    label: 'Multi-vendor firewall / SIEM',
    description:
      'Parses syslog from three firewall vendors and routes critical-severity events to a shared ' +
      'SIEM alert index (2-year retention). All other events go to vendor-specific indices.',
    topology: firewallTopology,
    entrySource: 'firewall_syslog_in',
    sampleDocument: {
      '@timestamp': '2026-06-02T10:00:00Z',
      'resource.attributes.vendor': 'paloalto',
      'attributes.severity': 'critical',
      'attributes.src_ip': '203.0.113.42',
      'attributes.dst_ip': '10.0.0.5',
      'attributes.action': 'block',
      'body.message': '2026-06-02T10:00:00,paloalto,THREAT,critical,203.0.113.42,10.0.0.5',
    },
  },
];
