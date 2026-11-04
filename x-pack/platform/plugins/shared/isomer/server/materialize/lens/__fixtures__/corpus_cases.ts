/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Copied from lane C's corpus (`@kbn/isomer-corpus`), captured from a real Kibana: each panel's
// as-code config, Kibana's inspector table (its columns keyed by their ES|QL names, as the ES|QL
// search returns them), and what Kibana drew in light and dark mode.

import type { Datatable } from '@kbn/expressions-plugin/common';

/** What Kibana drew for a panel in one color mode. */
export interface CorpusRendering {
  metric?: { background: string; texts: string[] };
  legend?: Array<{ name: string; color: string }>;
  series?: Array<{ name: string; color: string }>;
  axisTitles?: { x: string[]; y: string[] };
}

export interface CorpusCase {
  source: string;
  config: Record<string, unknown>;
  table?: Datatable;
  light: CorpusRendering;
  dark: CorpusRendering;
}

export const corpusCases: Record<string, CorpusCase> = {
  logsUniqueVisitors: {
    source: '@kbn/isomer-corpus captures/sample-logs/panels/11',
    config: {
      type: 'metric',
      title: '',
      sampling: 1,
      ignore_global_filters: false,
      data_source: {
        type: 'esql',
        query:
          'FROM kibana_sample_data_logs | STATS COUNT_DISTINCT(clientip) | RENAME `COUNT_DISTINCT(clientip)` as `Unique Visitors`',
      },
      styling: {
        density: 'compact',
        primary: {
          position: 'bottom',
          labels: {
            alignment: 'left',
          },
          value: {
            alignment: 'right',
            sizing: 'auto',
          },
        },
      },
      metrics: [
        {
          column: 'Unique Visitors',
          type: 'primary',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              {
                gte: 0,
                lt: 500,
                color: '#D23115',
              },
              {
                gte: 500,
                lt: 1000,
                color: '#FCC400',
              },
              {
                gte: 1000,
                color: '#68BC00',
              },
            ],
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query:
          'FROM kibana_sample_data_logs | STATS COUNT_DISTINCT(clientip) | RENAME `COUNT_DISTINCT(clientip)` as `Unique Visitors`',
        statistics: {
          totalCount: 1,
        },
      },
      columns: [
        {
          id: 'Unique Visitors',
          name: 'Unique Visitors',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'kibana_sample_data_logs',
              sourceField: 'Unique Visitors',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
          },
        },
      ],
      rows: [
        {
          'Unique Visitors': 828,
        },
      ],
    },
    light: {
      metric: {
        background: 'rgb(252, 196, 0)',
        texts: ['Unique Visitors', '828'],
      },
    },
    dark: {
      metric: {
        background: 'rgb(252, 196, 0)',
        texts: ['Unique Visitors', '828'],
      },
    },
  },
  logs4xxPercent: {
    source: '@kbn/isomer-corpus captures/sample-logs/panels/01d8e435-91c0-484f-a11e-856747050b0a',
    config: {
      type: 'metric',
      title: 'count_4xx & count_rest & HTTP 4xx of (empty)',
      sampling: 1,
      ignore_global_filters: false,
      data_source: {
        type: 'esql',
        query:
          'FROM kibana_sample_data_logs\n| EVAL type = CASE(TO_INTEGER(response.keyword) >= 400 and TO_INTEGER(response.keyword) < 500, "4xx", "Other")\n| STATS count = COUNT(*) by type\n| EVAL count_4xx = CASE(type == "4xx", count), count_rest = CASE(type == "Other", count)\n| DROP count, type\n| STATS count_4xx = MAX(count_4xx), count_rest = MAX(count_rest)\n| EVAL percentage = ROUND(count_4xx / TO_DOUBLE(count_4xx + count_rest), 3)\n| RENAME percentage as `HTTP 4xx (%)`\n| DROP count_4xx, count_rest',
      },
      styling: {
        density: 'compact',
        primary: {
          position: 'bottom',
          labels: {
            alignment: 'left',
          },
          value: {
            alignment: 'right',
            sizing: 'auto',
          },
        },
      },
      metrics: [
        {
          column: 'HTTP 4xx (%)',
          format: {
            type: 'percent',
            decimals: 2,
            compact: false,
          },
          type: 'primary',
          color: {
            type: 'auto',
          },
        },
      ],
      hide_title: true,
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query:
          'FROM kibana_sample_data_logs\n| EVAL type = CASE(TO_INTEGER(response.keyword) >= 400 and TO_INTEGER(response.keyword) < 500, "4xx", "Other")\n| STATS count = COUNT(*) by type\n| EVAL count_4xx = CASE(type == "4xx", count), count_rest = CASE(type == "Other", count)\n| DROP count, type\n| STATS count_4xx = MAX(count_4xx), count_rest = MAX(count_rest)\n| EVAL percentage = ROUND(count_4xx / TO_DOUBLE(count_4xx + count_rest), 3)\n| RENAME percentage as `HTTP 4xx (%)`\n| DROP count_4xx, count_rest',
        statistics: {
          totalCount: 1,
        },
      },
      columns: [
        {
          id: 'HTTP 4xx (%)',
          name: 'HTTP 4xx (%)',
          meta: {
            type: 'number',
            esType: 'double',
            sourceParams: {
              indexPattern: 'kibana_sample_data_logs',
              sourceField: 'HTTP 4xx (%)',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'percent',
              params: {
                pattern: '0,0.00%',
                formatOverride: true,
                decimals: 2,
              },
            },
          },
        },
      ],
      rows: [
        {
          'HTTP 4xx (%)': 0.046,
        },
      ],
    },
    light: {
      metric: {
        background: 'rgb(255, 255, 255)',
        texts: ['HTTP 4xx (%)', '4.60%', '%'],
      },
    },
    dark: {
      metric: {
        background: 'rgb(17, 28, 44)',
        texts: ['HTTP 4xx (%)', '4.60%', '%'],
      },
    },
  },
  logsVisits: {
    source: '@kbn/isomer-corpus captures/sample-logs/panels/bb94016e-f4a6-49ca-87a9-296a2869d570',
    config: {
      type: 'metric',
      title: '',
      sampling: 1,
      ignore_global_filters: false,
      data_source: {
        type: 'esql',
        query: 'FROM kibana_sample_data_logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`',
      },
      styling: {
        density: 'compact',
        primary: {
          position: 'bottom',
          labels: {
            alignment: 'left',
          },
          value: {
            alignment: 'right',
            sizing: 'auto',
          },
        },
      },
      metrics: [
        {
          column: 'Visits',
          type: 'primary',
          color: {
            type: 'auto',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query: 'FROM kibana_sample_data_logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`',
        statistics: {
          totalCount: 1,
        },
      },
      columns: [
        {
          id: 'Visits',
          name: 'Visits',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'kibana_sample_data_logs',
              sourceField: 'Visits',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
          },
        },
      ],
      rows: [
        {
          Visits: 1728,
        },
      ],
    },
    light: {
      metric: {
        background: 'rgb(255, 255, 255)',
        texts: ['Visits', '1,728'],
      },
    },
    dark: {
      metric: {
        background: 'rgb(17, 28, 44)',
        texts: ['Visits', '1,728'],
      },
    },
  },
  signedAverage: {
    source: '@kbn/isomer-corpus captures/isomer-corpus-values/panels/values-metric-esql',
    config: {
      type: 'metric',
      title: 'Signed average (ES|QL)',
      sampling: 1,
      ignore_global_filters: false,
      data_source: {
        type: 'esql',
        query: 'FROM isomer-corpus-edge-cases | STATS signed = AVG(signed)',
      },
      styling: {
        density: 'default',
        primary: {
          position: 'bottom',
          labels: {
            alignment: 'left',
          },
          value: {
            alignment: 'right',
            sizing: 'auto',
          },
        },
      },
      metrics: [
        {
          column: 'signed',
          type: 'primary',
          color: {
            type: 'auto',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query: 'FROM isomer-corpus-edge-cases | STATS signed = AVG(signed)',
        statistics: {
          totalCount: 1,
        },
      },
      columns: [
        {
          id: 'signed',
          name: 'signed',
          meta: {
            type: 'number',
            esType: 'double',
            sourceParams: {
              indexPattern: 'isomer-corpus-edge-cases',
              sourceField: 'signed',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
          },
        },
      ],
      rows: [
        {
          signed: -15.571428571428571,
        },
      ],
    },
    light: {
      metric: {
        background: 'rgb(255, 255, 255)',
        texts: ['signed', '-15.571', '-'],
      },
    },
    dark: {
      metric: {
        background: 'rgb(17, 28, 44)',
        texts: ['signed', '-15.571', '-'],
      },
    },
  },
  longMetricDataView: {
    source: '@kbn/isomer-corpus captures/isomer-corpus-long-titles/panels/long-metric',
    config: {
      type: 'metric',
      title:
        'A panel title long enough to overflow the panel header at every grid width, so truncation, wrapping and tooltips are exercised by each renderer',
      sampling: 1,
      ignore_global_filters: false,
      data_source: {
        type: 'data_view_spec',
        name: 'isomer-corpus-edge-cases',
        index_pattern: 'isomer-corpus-edge-cases',
        time_field: '@timestamp',
      },
      styling: {
        density: 'default',
        primary: {
          position: 'bottom',
          labels: {
            alignment: 'left',
          },
          value: {
            alignment: 'right',
            sizing: 'auto',
          },
        },
      },
      metrics: [
        {
          empty_as_null: false,
          operation: 'count',
          type: 'primary',
          color: {
            type: 'auto',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'esaggs',
        source:
          'isomer-corpus-edge-cases-@timestamp-b6eac90083980d83be9026b0d32d464d37c39f9232217faacebecfff5e40e06a',
        statistics: {
          totalCount: 168,
        },
      },
      columns: [
        {
          id: 'Count of records',
          name: 'Count of records',
          meta: {
            type: 'number',
            index: 'isomer-corpus-edge-cases',
            params: {
              id: 'number',
            },
            source: 'esaggs',
            sourceParams: {
              hasPrecisionError: false,
              indexPatternId:
                'isomer-corpus-edge-cases-@timestamp-b6eac90083980d83be9026b0d32d464d37c39f9232217faacebecfff5e40e06a',
              id: '0',
              enabled: true,
              type: 'count',
              params: {
                emptyAsNull: false,
              },
              schema: 'metric',
            },
          },
        },
      ],
      rows: [
        {
          'Count of records': 168,
        },
      ],
    },
    light: {
      metric: {
        background: 'rgb(255, 255, 255)',
        texts: ['Count of records', '168'],
      },
    },
    dark: {
      metric: {
        background: 'rgb(17, 28, 44)',
        texts: ['Count of records', '168'],
      },
    },
  },
  logsBytesDistribution: {
    source: '@kbn/isomer-corpus captures/sample-logs/panels/cbca842c-b9fa-4523-9ce0-14e350866e33',
    config: {
      type: 'xy',
      title: '[Logs] Bytes distribution',
      legend: {
        visibility: 'auto',
        placement: 'outside',
        layout: {
          type: 'grid',
          truncate: {
            max_lines: 1,
          },
        },
        position: 'right',
      },
      axis: {
        x: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'linear',
          domain: {
            type: 'fit',
            rounding: false,
          },
        },
        y: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'linear',
          domain: {
            type: 'full',
            rounding: true,
          },
        },
      },
      styling: {
        overlays: {
          partial_buckets: {
            visible: false,
          },
          current_time_marker: {
            visible: false,
          },
        },
        bars: {
          minimum_height: 1,
          data_labels: {
            visible: false,
          },
        },
      },
      layers: [
        {
          sampling: 1,
          ignore_global_filters: false,
          data_source: {
            type: 'esql',
            query:
              'FROM kibana_sample_data_logs\n| INLINESTATS total_visits = COUNT()\n| STATS visits = COUNT() by bytes = bucket(bytes, 1000, 0, 100000), total_visits\n| EVAL percentage = (TO_DOUBLE(visits) / total_visits)\n| EVAL percentage = ROUND(percentage, 3)\n| DROP total_visits, visits',
          },
          type: 'bar_stacked',
          y: [
            {
              column: 'percentage',
              format: {
                type: 'percent',
                decimals: 1,
                compact: false,
              },
              axis: 'y',
              color: {
                type: 'auto',
              },
            },
          ],
          x: {
            column: 'bytes',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query:
          'FROM kibana_sample_data_logs\n| INLINESTATS total_visits = COUNT()\n| STATS visits = COUNT() by bytes = bucket(bytes, 1000, 0, 100000), total_visits\n| EVAL percentage = (TO_DOUBLE(visits) / total_visits)\n| EVAL percentage = ROUND(percentage, 3)\n| DROP total_visits, visits',
        statistics: {
          totalCount: 150,
        },
      },
      columns: [
        {
          id: 'bytes',
          name: 'bytes',
          meta: {
            type: 'number',
            esType: 'double',
            sourceParams: {
              indexPattern: 'kibana_sample_data_logs',
              sourceField: 'bytes',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
            esMeta: {
              bucket: {
                interval: 100,
              },
            },
          },
        },
        {
          id: 'percentage',
          name: 'percentage',
          meta: {
            type: 'number',
            esType: 'double',
            sourceParams: {
              indexPattern: 'kibana_sample_data_logs',
              sourceField: 'percentage',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'percent',
              params: {
                pattern: '0,0.0%',
                formatOverride: true,
                decimals: 1,
              },
            },
          },
        },
      ],
      rows: [
        {
          bytes: 8400,
          percentage: 0.013,
        },
        {
          bytes: 5300,
          percentage: 0.012,
        },
        {
          bytes: 6100,
          percentage: 0.013,
        },
        {
          bytes: 11100,
          percentage: 0.002,
        },
        {
          bytes: 8500,
          percentage: 0.009,
        },
        {
          bytes: 7300,
          percentage: 0.009,
        },
        {
          bytes: 3300,
          percentage: 0.013,
        },
        {
          bytes: 7000,
          percentage: 0.012,
        },
        {
          bytes: 3800,
          percentage: 0.012,
        },
        {
          bytes: 3100,
          percentage: 0.011,
        },
        {
          bytes: 8900,
          percentage: 0.01,
        },
        {
          bytes: 4600,
          percentage: 0.013,
        },
        {
          bytes: 9600,
          percentage: 0.013,
        },
        {
          bytes: 3600,
          percentage: 0.011,
        },
        {
          bytes: 4100,
          percentage: 0.012,
        },
        {
          bytes: 3200,
          percentage: 0.009,
        },
        {
          bytes: 7900,
          percentage: 0.005,
        },
        {
          bytes: 7800,
          percentage: 0.006,
        },
        {
          bytes: 9400,
          percentage: 0.013,
        },
        {
          bytes: 7500,
          percentage: 0.013,
        },
        {
          bytes: 5700,
          percentage: 0.008,
        },
        {
          bytes: 7700,
          percentage: 0.01,
        },
        {
          bytes: 7100,
          percentage: 0.01,
        },
        {
          bytes: 5000,
          percentage: 0.01,
        },
        {
          bytes: 9300,
          percentage: 0.008,
        },
        {
          bytes: 2400,
          percentage: 0.008,
        },
        {
          bytes: 2000,
          percentage: 0.007,
        },
        {
          bytes: 5600,
          percentage: 0.012,
        },
        {
          bytes: 600,
          percentage: 0.012,
        },
        {
          bytes: 2100,
          percentage: 0.012,
        },
        {
          bytes: 4200,
          percentage: 0.009,
        },
        {
          bytes: 6500,
          percentage: 0.014,
        },
        {
          bytes: 4700,
          percentage: 0.01,
        },
        {
          bytes: 0,
          percentage: 0.032,
        },
        {
          bytes: 400,
          percentage: 0.007,
        },
        {
          bytes: 16200,
          percentage: 0.001,
        },
        {
          bytes: 8800,
          percentage: 0.01,
        },
        {
          bytes: 9000,
          percentage: 0.012,
        },
        {
          bytes: 6700,
          percentage: 0.014,
        },
        {
          bytes: 5500,
          percentage: 0.011,
        },
        {
          bytes: 6200,
          percentage: 0.01,
        },
        {
          bytes: 4500,
          percentage: 0.009,
        },
        {
          bytes: 6000,
          percentage: 0.009,
        },
        {
          bytes: 9200,
          percentage: 0.008,
        },
        {
          bytes: 800,
          percentage: 0.005,
        },
        {
          bytes: 3700,
          percentage: 0.008,
        },
        {
          bytes: 4000,
          percentage: 0.012,
        },
        {
          bytes: 4400,
          percentage: 0.009,
        },
        {
          bytes: 16700,
          percentage: 0.001,
        },
        {
          bytes: 2300,
          percentage: 0.007,
        },
        {
          bytes: 700,
          percentage: 0.005,
        },
        {
          bytes: 6900,
          percentage: 0.009,
        },
        {
          bytes: 1900,
          percentage: 0.01,
        },
        {
          bytes: 8200,
          percentage: 0.009,
        },
        {
          bytes: 1500,
          percentage: 0.009,
        },
        {
          bytes: 5900,
          percentage: 0.011,
        },
        {
          bytes: 9700,
          percentage: 0.008,
        },
        {
          bytes: 5100,
          percentage: 0.01,
        },
        {
          bytes: 11900,
          percentage: 0.002,
        },
        {
          bytes: 6800,
          percentage: 0.008,
        },
        {
          bytes: 8700,
          percentage: 0.008,
        },
        {
          bytes: 5800,
          percentage: 0.011,
        },
        {
          bytes: 900,
          percentage: 0.005,
        },
        {
          bytes: 4900,
          percentage: 0.008,
        },
        {
          bytes: 5400,
          percentage: 0.011,
        },
        {
          bytes: 8100,
          percentage: 0.009,
        },
        {
          bytes: 9900,
          percentage: 0.012,
        },
        {
          bytes: 100,
          percentage: 0.007,
        },
        {
          bytes: 6400,
          percentage: 0.008,
        },
        {
          bytes: 9100,
          percentage: 0.009,
        },
        {
          bytes: 7200,
          percentage: 0.009,
        },
        {
          bytes: 7400,
          percentage: 0.008,
        },
        {
          bytes: 6600,
          percentage: 0.009,
        },
        {
          bytes: 2500,
          percentage: 0.01,
        },
        {
          bytes: 2800,
          percentage: 0.008,
        },
        {
          bytes: 2200,
          percentage: 0.006,
        },
        {
          bytes: 2700,
          percentage: 0.009,
        },
        {
          bytes: 4800,
          percentage: 0.01,
        },
        {
          bytes: 16100,
          percentage: 0.001,
        },
        {
          bytes: 6300,
          percentage: 0.012,
        },
        {
          bytes: 3500,
          percentage: 0.012,
        },
        {
          bytes: 8000,
          percentage: 0.013,
        },
        {
          bytes: 5200,
          percentage: 0.012,
        },
        {
          bytes: 8600,
          percentage: 0.008,
        },
        {
          bytes: 1800,
          percentage: 0.007,
        },
        {
          bytes: 4300,
          percentage: 0.012,
        },
        {
          bytes: 11800,
          percentage: 0.002,
        },
        {
          bytes: 17500,
          percentage: 0.001,
        },
        {
          bytes: 15000,
          percentage: 0.005,
        },
        {
          bytes: 3000,
          percentage: 0.01,
        },
        {
          bytes: 1200,
          percentage: 0.001,
        },
        {
          bytes: 8300,
          percentage: 0.008,
        },
        {
          bytes: 14000,
          percentage: 0.002,
        },
        {
          bytes: 3900,
          percentage: 0.013,
        },
        {
          bytes: 12900,
          percentage: 0.001,
        },
        {
          bytes: 7600,
          percentage: 0.012,
        },
        {
          bytes: 1600,
          percentage: 0.008,
        },
        {
          bytes: 1100,
          percentage: 0.001,
        },
        {
          bytes: 17400,
          percentage: 0.001,
        },
        {
          bytes: 300,
          percentage: 0.012,
        },
        {
          bytes: 9800,
          percentage: 0.013,
        },
        {
          bytes: 13600,
          percentage: 0.002,
        },
        {
          bytes: 10200,
          percentage: 0.001,
        },
        {
          bytes: 18800,
          percentage: 0.001,
        },
        {
          bytes: 9500,
          percentage: 0.014,
        },
        {
          bytes: 2600,
          percentage: 0.009,
        },
        {
          bytes: 12400,
          percentage: 0.001,
        },
        {
          bytes: 2900,
          percentage: 0.007,
        },
        {
          bytes: 200,
          percentage: 0.006,
        },
        {
          bytes: 13900,
          percentage: 0.001,
        },
        {
          bytes: 13300,
          percentage: 0.001,
        },
        {
          bytes: 1700,
          percentage: 0.008,
        },
        {
          bytes: 17300,
          percentage: 0.001,
        },
        {
          bytes: 13800,
          percentage: 0.001,
        },
        {
          bytes: 1400,
          percentage: 0.001,
        },
        {
          bytes: 17000,
          percentage: 0.001,
        },
        {
          bytes: 12300,
          percentage: 0.001,
        },
        {
          bytes: 15600,
          percentage: 0.001,
        },
        {
          bytes: 14400,
          percentage: 0.002,
        },
        {
          bytes: 12600,
          percentage: 0.001,
        },
        {
          bytes: 14300,
          percentage: 0.002,
        },
        {
          bytes: 14500,
          percentage: 0.001,
        },
        {
          bytes: 10400,
          percentage: 0.002,
        },
        {
          bytes: 12500,
          percentage: 0.001,
        },
        {
          bytes: 12100,
          percentage: 0.001,
        },
        {
          bytes: 10100,
          percentage: 0.002,
        },
        {
          bytes: 15300,
          percentage: 0.001,
        },
        {
          bytes: 19700,
          percentage: 0.001,
        },
        {
          bytes: 18000,
          percentage: 0.001,
        },
        {
          bytes: 19500,
          percentage: 0.002,
        },
        {
          bytes: 13000,
          percentage: 0.001,
        },
        {
          bytes: 13700,
          percentage: 0.001,
        },
        {
          bytes: 16900,
          percentage: 0.001,
        },
        {
          bytes: 16300,
          percentage: 0.001,
        },
        {
          bytes: 19300,
          percentage: 0.001,
        },
        {
          bytes: 15400,
          percentage: 0.001,
        },
        {
          bytes: 11200,
          percentage: 0.001,
        },
        {
          bytes: 11000,
          percentage: 0.001,
        },
        {
          bytes: 16600,
          percentage: 0.001,
        },
        {
          bytes: 18500,
          percentage: 0.001,
        },
        {
          bytes: 12800,
          percentage: 0.001,
        },
        {
          bytes: 500,
          percentage: 0.003,
        },
        {
          bytes: 15700,
          percentage: 0.001,
        },
        {
          bytes: 14700,
          percentage: 0.001,
        },
        {
          bytes: 16800,
          percentage: 0.001,
        },
        {
          bytes: 10500,
          percentage: 0.001,
        },
        {
          bytes: 11300,
          percentage: 0.001,
        },
        {
          bytes: 10800,
          percentage: 0.001,
        },
        {
          bytes: 14800,
          percentage: 0.001,
        },
        {
          bytes: 3400,
          percentage: 0.012,
        },
      ],
    },
    light: {
      legend: [
        {
          name: 'percentage',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'percentage',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['bytes'],
        y: ['percentage'],
      },
    },
    dark: {
      legend: [
        {
          name: 'percentage',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'percentage',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['bytes'],
        y: ['percentage'],
      },
    },
  },
  tagsHorizontal: {
    source: '@kbn/isomer-corpus captures/isomer-corpus-buckets/panels/buckets-xy-multivalue-esql',
    config: {
      type: 'xy',
      title: 'Documents per tag (ES|QL, multivalue expanded)',
      legend: {
        visibility: 'hidden',
        placement: 'outside',
        layout: {
          type: 'grid',
          truncate: {
            max_lines: 1,
          },
        },
        position: 'right',
      },
      axis: {
        x: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'ordinal',
          domain: {
            type: 'fit',
            rounding: false,
          },
        },
        y: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'linear',
          domain: {
            type: 'full',
            rounding: true,
          },
        },
      },
      styling: {
        overlays: {
          partial_buckets: {
            visible: false,
          },
          current_time_marker: {
            visible: false,
          },
        },
        bars: {
          minimum_height: 1,
          data_labels: {
            visible: false,
          },
        },
      },
      layers: [
        {
          sampling: 1,
          ignore_global_filters: false,
          data_source: {
            type: 'esql',
            query:
              'FROM isomer-corpus-edge-cases | MV_EXPAND tags | STATS count = COUNT(*) BY tags | SORT count DESC',
          },
          type: 'bar_horizontal',
          y: [
            {
              column: 'count',
              axis: 'y',
              color: {
                type: 'auto',
              },
            },
          ],
          x: {
            column: 'tags',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query:
          'FROM isomer-corpus-edge-cases | MV_EXPAND tags | STATS count = COUNT(*) BY tags | SORT count DESC',
        statistics: {
          totalCount: 6,
        },
      },
      columns: [
        {
          id: 'count',
          name: 'count',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'isomer-corpus-edge-cases',
              sourceField: 'count',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
          },
        },
        {
          id: 'tags',
          name: 'tags',
          meta: {
            type: 'string',
            esType: 'keyword',
            sourceParams: {
              indexPattern: 'isomer-corpus-edge-cases',
              sourceField: 'tags',
              isSourceFieldFilterable: true,
            },
            params: {
              id: 'string',
            },
          },
        },
      ],
      rows: [
        {
          count: 51,
          tags: 'blue',
        },
        {
          count: 51,
          tags: 'green',
        },
        {
          count: 50,
          tags: 'red',
        },
        {
          count: 50,
          tags: 'cyan',
        },
        {
          count: 50,
          tags: 'magenta',
        },
        {
          count: 42,
          tags: null,
        },
      ],
    },
    light: {
      legend: [
        {
          name: 'count',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'count',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['tags'],
        y: ['count'],
      },
    },
    dark: {
      legend: [
        {
          name: 'count',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'count',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['tags'],
        y: ['count'],
      },
    },
  },
  hugePerDay: {
    source: '@kbn/isomer-corpus captures/isomer-corpus-values/panels/values-xy-huge-esql',
    config: {
      type: 'xy',
      title: 'Huge values per day (ES|QL)',
      legend: {
        visibility: 'hidden',
        placement: 'outside',
        layout: {
          type: 'grid',
          truncate: {
            max_lines: 1,
          },
        },
        position: 'right',
      },
      axis: {
        x: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'ordinal',
          domain: {
            type: 'fit',
            rounding: false,
          },
        },
        y: {
          title: {
            visible: true,
          },
          ticks: {
            visible: true,
          },
          grid: {
            visible: true,
          },
          labels: {
            orientation: 'horizontal',
          },
          scale: 'linear',
          domain: {
            type: 'full',
            rounding: true,
          },
        },
      },
      styling: {
        overlays: {
          partial_buckets: {
            visible: false,
          },
          current_time_marker: {
            visible: false,
          },
        },
        interpolation: 'linear',
        points: {
          visibility: 'auto',
        },
        areas: {
          fill_opacity: 0.3,
          fill: 'gradient',
        },
      },
      layers: [
        {
          sampling: 1,
          ignore_global_filters: false,
          data_source: {
            type: 'esql',
            query:
              'FROM isomer-corpus-edge-cases | STATS total = SUM(huge) BY day = BUCKET(@timestamp, 1 day)',
          },
          type: 'area',
          y: [
            {
              column: 'total',
              axis: 'y',
              color: {
                type: 'auto',
              },
            },
          ],
          x: {
            column: 'day',
          },
        },
      ],
    },
    table: {
      type: 'datatable',
      meta: {
        type: 'es_ql',
        query:
          'FROM isomer-corpus-edge-cases | STATS total = SUM(huge) BY day = BUCKET(@timestamp, 1 day)',
        statistics: {
          totalCount: 7,
        },
      },
      columns: [
        {
          id: 'total',
          name: 'total',
          meta: {
            type: 'number',
            esType: 'double',
            sourceParams: {
              indexPattern: 'isomer-corpus-edge-cases',
              sourceField: 'total',
              isSourceFieldFilterable: false,
            },
            params: {
              id: 'number',
            },
          },
        },
        {
          id: 'day',
          name: 'day',
          meta: {
            type: 'date',
            esType: 'date',
            sourceParams: {
              appliedTimeRange: {
                from: '2024-01-01T00:00:00.000Z',
                to: '2024-01-08T00:00:00.000Z',
              },
              params: {},
              indexPattern: 'isomer-corpus-edge-cases',
              sourceField: 'day',
              isSourceFieldFilterable: false,
              computedDomain: {
                min: 1704067200000,
                max: 1704585600000,
              },
            },
            params: {
              id: 'date',
            },
            esMeta: {
              bucket: {
                interval: 1,
                unit: 'day',
              },
            },
          },
        },
      ],
      rows: [
        {
          total: 33690000000000000000,
          day: 1704240000000,
        },
        {
          total: 32700000000000000000,
          day: 1704326400000,
        },
        {
          total: 32700000000000000000,
          day: 1704067200000,
        },
        {
          total: 33690000000000000000,
          day: 1704499200000,
        },
        {
          total: 33600000000000000000,
          day: 1704153600000,
        },
        {
          total: 32700000000000000000,
          day: 1704585600000,
        },
        {
          total: 33600000000000000000,
          day: 1704412800000,
        },
      ],
    },
    light: {
      legend: [
        {
          name: 'total',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'total',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['day'],
        y: ['total'],
      },
    },
    dark: {
      legend: [
        {
          name: 'total',
          color: '#16c5c0',
        },
      ],
      series: [
        {
          name: 'total',
          color: '#16c5c0',
        },
      ],
      axisTitles: {
        x: ['day'],
        y: ['total'],
      },
    },
  },
};
