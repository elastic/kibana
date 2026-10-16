/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SourceType } from './types';

export interface SourceTypeConfig {
  type: SourceType;
  label: string;
  shortLabel: string;
  codeTabs: Array<{
    id: string;
    label: string;
    getSnippet: (endpoint: string, apiKey: string) => string;
  }>;
}

const SOURCE_TYPE_CONFIG_ORDER: Record<SourceType, number> = {
  async_bulk: 0,
  otlp: 1,
  prometheus_remote_write: 2,
  bulk: 3,
  es_otlp: 4,
  es_prometheus_remote_write: 5,
};

export const SOURCE_TYPE_CONFIGS: SourceTypeConfig[] = (
  [
    {
      type: 'bulk',
      label: i18n.translate('xpack.streams.sources.sourceType.bulkLabel', {
        defaultMessage: 'Direct _bulk',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.bulkShortLabel', {
        defaultMessage: 'Direct _bulk',
      }),
      codeTabs: [
        {
          id: 'logstash',
          label: i18n.translate('xpack.streams.sources.codeTab.logstashLabel', {
            defaultMessage: 'Logstash',
          }),
          getSnippet: (endpoint, apiKey) => `output {
  elasticsearch {
    hosts => ["${endpoint}"]
    custom_headers => {
      "Authorization" => "ApiKey ${apiKey}"
    }
    action => "create"
  }
}`,
        },
      ],
    },
    {
      type: 'async_bulk',
      label: i18n.translate('xpack.streams.sources.sourceType.asyncBulkLabel', {
        defaultMessage: 'Managed _bulk',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.asyncBulkShortLabel', {
        defaultMessage: 'Managed _bulk',
      }),
      codeTabs: [
        {
          id: 'logstash',
          label: i18n.translate('xpack.streams.sources.codeTab.logstashManagedLabel', {
            defaultMessage: 'Logstash',
          }),
          getSnippet: (endpoint, apiKey) => `output {
  elasticsearch {
    hosts => ["${endpoint}"]
    custom_headers => {
      "Authorization" => "ApiKey ${apiKey}"
    }
    action => "create"
  }
}`,
        },
      ],
    },
    {
      type: 'otlp',
      label: i18n.translate('xpack.streams.sources.sourceType.otlpLabel', {
        defaultMessage: 'OTLP endpoint',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.otlpShortLabel', {
        defaultMessage: 'OTLP endpoint',
      }),
      codeTabs: [
        {
          id: 'otelCollector',
          label: i18n.translate('xpack.streams.sources.codeTab.otelCollectorLabel', {
            defaultMessage: 'OTel Collector',
          }),
          getSnippet: (endpoint, apiKey) => `exporters:
  otlphttp/elastic:
    endpoint: "${endpoint}"
    headers:
      Authorization: "ApiKey ${apiKey}"
    sending_queue:
      enabled: true`,
        },
        {
          id: 'k8sOperator',
          label: i18n.translate('xpack.streams.sources.codeTab.k8sOperatorLabel', {
            defaultMessage: 'K8s Operator',
          }),
          getSnippet: (endpoint, apiKey) => `env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "${endpoint}"
  - name: OTEL_EXPORTER_OTLP_HEADERS
    value: "Authorization=ApiKey ${apiKey}"`,
        },
      ],
    },
    {
      type: 'es_otlp',
      label: i18n.translate('xpack.streams.sources.sourceType.esOtlpLabel', {
        defaultMessage: 'Direct OTLP',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.esOtlpShortLabel', {
        defaultMessage: 'Direct OTLP',
      }),
      codeTabs: [
        {
          id: 'otelCollector',
          label: i18n.translate('xpack.streams.sources.codeTab.esOtlpCollectorLabel', {
            defaultMessage: 'OTel Collector',
          }),
          getSnippet: (endpoint, apiKey) => `exporters:
  otlphttp/elastic:
    endpoint: "${endpoint}"
    headers:
      Authorization: "ApiKey ${apiKey}"
    sending_queue:
      enabled: true`,
        },
        {
          id: 'k8sOperator',
          label: i18n.translate('xpack.streams.sources.codeTab.esOtlpK8sOperatorLabel', {
            defaultMessage: 'K8s Operator',
          }),
          getSnippet: (endpoint, apiKey) => `env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "${endpoint}"
  - name: OTEL_EXPORTER_OTLP_HEADERS
    value: "Authorization=ApiKey ${apiKey}"`,
        },
      ],
    },
    {
      type: 'prometheus_remote_write',
      label: i18n.translate('xpack.streams.sources.sourceType.prometheusLabel', {
        defaultMessage: 'Prometheus Remote Write',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.prometheusShortLabel', {
        defaultMessage: 'Prometheus Remote Write',
      }),
      codeTabs: [
        {
          id: 'prometheus',
          label: i18n.translate('xpack.streams.sources.codeTab.prometheusLabel', {
            defaultMessage: 'Prometheus',
          }),
          getSnippet: (endpoint, apiKey) => `remote_write:
  - url: ${endpoint}
    authorization:
      type: ApiKey
      credentials: ${apiKey}`,
        },
        {
          id: 'grafanaAlloy',
          label: i18n.translate('xpack.streams.sources.codeTab.grafanaAlloyLabel', {
            defaultMessage: 'Grafana Alloy',
          }),
          getSnippet: (endpoint, apiKey) => `prometheus.remote_write "elastic" {
  endpoint {
    url = "${endpoint}"
    authorization {
      type = "ApiKey"
      credentials = "${apiKey}"
    }
  }
}`,
        },
      ],
    },
    {
      type: 'es_prometheus_remote_write',
      label: i18n.translate('xpack.streams.sources.sourceType.esPrometheusLabel', {
        defaultMessage: 'Direct Prometheus Remote Write',
      }),
      shortLabel: i18n.translate('xpack.streams.sources.sourceType.esPrometheusShortLabel', {
        defaultMessage: 'Direct Prometheus Remote Write',
      }),
      codeTabs: [
        {
          id: 'prometheus',
          label: i18n.translate('xpack.streams.sources.codeTab.prometheusLabel', {
            defaultMessage: 'Prometheus',
          }),
          getSnippet: (endpoint, apiKey) => `remote_write:
  - url: ${endpoint}
    authorization:
      type: ApiKey
      credentials: ${apiKey}`,
        },
        {
          id: 'grafanaAlloy',
          label: i18n.translate('xpack.streams.sources.codeTab.grafanaAlloyLabel', {
            defaultMessage: 'Grafana Alloy',
          }),
          getSnippet: (endpoint, apiKey) => `prometheus.remote_write "elastic" {
  endpoint {
    url = "${endpoint}"
    authorization {
      type = "ApiKey"
      credentials = "${apiKey}"
    }
  }
}`,
        },
      ],
    },
  ] as SourceTypeConfig[]
).sort(
  (firstConfig, secondConfig) =>
    SOURCE_TYPE_CONFIG_ORDER[firstConfig.type] - SOURCE_TYPE_CONFIG_ORDER[secondConfig.type]
);

export const SOURCE_TYPE_CONFIG_BY_TYPE = SOURCE_TYPE_CONFIGS.reduce<
  Record<SourceType, SourceTypeConfig>
>((configs, config) => {
  configs[config.type] = config;
  return configs;
}, {} as Record<SourceType, SourceTypeConfig>);
