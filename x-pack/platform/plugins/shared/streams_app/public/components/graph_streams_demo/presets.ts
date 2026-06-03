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

export interface SampleDocument {
  /** Short label shown on the button, e.g. "monitoring → platform logs" */
  label: string;
  document: Record<string, unknown>;
}

export interface GraphPreset {
  id: string;
  label: string;
  description: string;
  topology: GraphDsl;
  /** ID of the entry source node (where the sample doc is submitted). */
  entrySource: string;
  /** Up to 3 sample docs that exercise different paths through the topology. */
  sampleDocuments: SampleDocument[];
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
          to: 'attributes.k8s.cluster',
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
          to: 'attributes.env',
          value: 'production',
        },
      ],
    },
    payment_enrich: {
      steps: [
        {
          action: 'set',
          to: 'attributes.pci_scope',
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
          to: 'attributes.vendor_name',
          value: 'paloalto',
        },
      ],
    },
    checkpoint_parse: {
      steps: [
        {
          action: 'set',
          to: 'attributes.vendor_name',
          value: 'checkpoint',
        },
      ],
    },
    fortinet_parse: {
      steps: [
        {
          action: 'set',
          to: 'attributes.vendor_name',
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
      lifecycle: { dsl: { data_retention: '730d' } },
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
// Security log normalization — 4 sequential processing stages
// ---------------------------------------------------------------------------
const securityTopology: GraphDsl = {
  name: 'security-topology',
  sources: {
    raw_syslog_in: { type: 'async_bulk' },
  },
  pipelines: {
    parse_syslog: {
      steps: [
        {
          action: 'grok',
          from: 'body.message',
          patterns: [
            '%{SYSLOGTIMESTAMP:attributes.ts} %{SYSLOGHOST:attributes.host} %{DATA:attributes.process}\\[%{POSINT:attributes.pid}\\]: %{GREEDYDATA:attributes.msg}',
          ],
        },
      ],
    },
    enrich_geoip: {
      steps: [
        {
          action: 'set',
          to: 'attributes.geo.country_iso_code',
          value: 'RU',
        },
        {
          action: 'set',
          to: 'attributes.geo.city_name',
          value: 'Moscow',
        },
      ],
    },
    enrich_threat_intel: {
      steps: [
        {
          action: 'set',
          to: 'attributes.threat.feed',
          value: 'known-bad-ips',
        },
        {
          action: 'set',
          to: 'attributes.threat.score',
          value: 9.2,
        },
      ],
    },
  },
  destinations: {
    siem_critical: {
      type: 'elasticsearch',
      lifecycle: { dsl: { data_retention: '730d' } },
    },
    siem_archive: { type: 'elasticsearch' },
  },
  routing: [
    { from: 'raw_syslog_in', to: 'parse_syslog' },
    { from: 'parse_syslog', to: 'enrich_geoip' },
    { from: 'enrich_geoip', to: 'enrich_threat_intel' },
    {
      from: 'enrich_threat_intel',
      to: 'siem_critical',
      where: { field: 'resource.attributes.host.name', eq: 'prod-firewall-01' },
    },
    { from: 'enrich_threat_intel', to: 'siem_archive' },
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
    sampleDocuments: [
      {
        label: 'monitoring ns → k8s_platform_logs',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'body.message': '2026-06-03T10:00:00Z INFO Prometheus scrape complete',
          'resource.attributes.k8s.namespace.name': 'monitoring',
          'resource.attributes.k8s.pod.name': 'prometheus-0',
          'resource.attributes.service.name': 'prometheus',
        },
      },
      {
        label: 'kube-system ns → k8s_system_logs',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'body.message': '2026-06-03T10:00:00Z WARN Node memory pressure detected',
          'resource.attributes.k8s.namespace.name': 'kube-system',
          'resource.attributes.k8s.pod.name': 'kube-proxy-xj7k2',
          'resource.attributes.service.name': 'kube-proxy',
        },
      },
      {
        label: 'no namespace → retained in k8s_otlp_in',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'body.message': '2026-06-03T10:00:00Z INFO VM metrics collected',
          'resource.attributes.service.name': 'node-exporter',
          'resource.attributes.host.name': 'bare-metal-01',
        },
      },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce payment processing',
    description:
      'Routes order-service events to PCI-scoped, fulfillment, or general-app indices. ' +
      'Payment events go through a redaction pipeline before landing in the PCI index (365-day retention).',
    topology: ecommerceTopology,
    entrySource: 'orders_otlp_in',
    sampleDocuments: [
      {
        label: 'payment → payment_pci_logs (2 hops)',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.service.name': 'orders-service',
          'attributes.event_type': 'payment',
          'attributes.order_id': 'ord-9182',
          'attributes.amount': 149.99,
          'attributes.card_number': '4111-1111-1111-1111',
        },
      },
      {
        label: 'fulfillment → fulfillment_logs',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.service.name': 'orders-service',
          'attributes.event_type': 'fulfillment',
          'attributes.order_id': 'ord-9182',
          'attributes.warehouse': 'us-east-2',
        },
      },
      {
        label: 'non-orders service → retained in orders_otlp_in',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.service.name': 'web-frontend',
          'attributes.event_type': 'page_view',
          'attributes.path': '/checkout',
        },
      },
    ],
  },
  {
    id: 'firewall',
    label: 'Multi-vendor firewall / SIEM',
    description:
      'Parses syslog from three firewall vendors and routes critical-severity events to a shared ' +
      'SIEM alert index (730-day retention). All other events go to vendor-specific indices.',
    topology: firewallTopology,
    entrySource: 'firewall_syslog_in',
    sampleDocuments: [
      {
        label: 'PaloAlto critical → siem_high_severity_alerts',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.vendor': 'paloalto',
          'attributes.severity': 'critical',
          'attributes.src_ip': '203.0.113.42',
          'attributes.dst_ip': '10.0.0.5',
          'attributes.action': 'block',
          'body.message': '2026-06-03T10:00:00,paloalto,THREAT,critical,203.0.113.42,10.0.0.5',
        },
      },
      {
        label: 'Checkpoint → checkpoint_firewall_logs',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.vendor': 'checkpoint',
          'attributes.severity': 'info',
          'attributes.src_ip': '10.1.2.3',
          'attributes.dst_ip': '8.8.8.8',
          'attributes.action': 'accept',
          'body.message':
            '2026-06-03T10:00:00 fw-cp-01 accept src=10.1.2.3 dst=8.8.8.8 severity=info',
        },
      },
      {
        label: 'Fortinet → fortinet_firewall_logs',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'resource.attributes.vendor': 'fortinet',
          'attributes.severity': 'warning',
          'attributes.src_ip': '172.16.0.10',
          'attributes.dst_ip': '1.1.1.1',
          'attributes.action': 'deny',
          'body.message':
            'date=2026-06-03 time=10:00:00 devname=FGT60F level=warning action=deny srcip=172.16.0.10 dstip=1.1.1.1',
        },
      },
    ],
  },
  {
    id: 'security',
    label: 'Security log normalization (4 stages)',
    description:
      'Syslog enters a 4-stage pipeline: parse → geo-enrich → threat-intel → route. ' +
      'Demonstrates sequential multi-stage processing before a routing decision.',
    topology: securityTopology,
    entrySource: 'raw_syslog_in',
    sampleDocuments: [
      {
        label: 'prod-firewall-01 → siem_critical (all 4 stages)',
        document: {
          '@timestamp': '2026-06-03T10:00:00Z',
          'body.message':
            'Jun  3 10:00:01 prod-firewall-01 sshd[1234]: Failed password for root from 185.220.101.42 port 54321',
          'resource.attributes.host.name': 'prod-firewall-01',
          'resource.attributes.service.name': 'syslog',
        },
      },
      {
        label: 'backup-firewall-02 → siem_archive (all 4 stages)',
        document: {
          '@timestamp': '2026-06-03T10:01:00Z',
          'body.message':
            'Jun  3 10:01:00 backup-firewall-02 sshd[5678]: Accepted publickey for deploy from 10.0.1.5 port 22',
          'resource.attributes.host.name': 'backup-firewall-02',
          'resource.attributes.service.name': 'syslog',
        },
      },
    ],
  },
];
