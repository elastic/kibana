/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensCreateRequestBody,
  LensCreateResponseBody,
  LensGetResponseBody,
  LensSearchResponseBody,
  LensUpdateRequestBody,
  LensUpdateResponseBody,
} from './types';

const lensVisualizationApiOverviewDescription =
  'Create, retrieve, update, and delete [Kibana visualizations](https://www.elastic.co/docs/explore-analyze/visualize/lens). Visualizations created through this API are saved to your [visualization library](https://www.elastic.co/docs/explore-analyze/visualize/visualize-library).\n' +
  '\n' +
  '## When to use this API\n' +
  '\n' +
  '- Use this API to create reusable charts saved to the visualization library. You can then embed them in dashboards by referencing their ID from the [Dashboards API](dashboards#tag/Dashboards/operation/post-dashboards).\n' +
  '- Use the [Dashboards API](dashboards#tag/Dashboards/operation/post-dashboards) when you want to define a complete dashboard in one request, or when you need ES|QL-based visualizations.\n' +
  '\n' +
  '## Get started\n' +
  '\n' +
  'Before you begin:\n' +
  '\n' +
  '- **Authentication**: Refer to [Authentication](https://www.elastic.co/docs/api/doc/kibana#authentication) in the Kibana API documentation.\n' +
  '- **CSRF protection**: Write operations (`POST`, `PUT`, `DELETE`) require the `kbn-xsrf: true` header.\n' +
  '- **Spaces**: If you use non-default [Kibana spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces), prepend `s/{space_id}/` to the path.\n' +
  '\n' +
  '### Try it now\n' +
  '\n' +
  'The following example creates a line chart showing log entries over time. You can run it after installing the [Kibana sample logs dataset](https://www.elastic.co/docs/manage-data/ingest/sample-data):\n' +
  '\n' +
  '```bash\n' +
  'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
  '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
  '  -H "kbn-xsrf: true" \\\n' +
  '  -H "Content-Type: application/json" \\\n' +
  "  -d '{\n" +
  '    "type": "xy",\n' +
  '    "title": "Total log entries over time",\n' +
  '    "layers": [\n' +
  '      {\n' +
  '        "type": "line",\n' +
  '        "data_source": {\n' +
  '          "type": "data_view_spec",\n' +
  '          "index_pattern": "kibana_sample_data_logs",\n' +
  '          "time_field": "timestamp"\n' +
  '        },\n' +
  '        "x": {\n' +
  '          "operation": "date_histogram",\n' +
  '          "field": "timestamp"\n' +
  '        },\n' +
  '        "y": [\n' +
  '          {\n' +
  '            "operation": "count"\n' +
  '          }\n' +
  '        ]\n' +
  '      }\n' +
  '    ]\n' +
  "  }'\n" +
  '```\n' +
  '\n' +
  'All curl examples in this reference use [Kibana sample datasets](https://www.elastic.co/docs/manage-data/ingest/sample-data) (`kibana_sample_data_logs`, `kibana_sample_data_ecommerce`, `kibana_sample_data_flights`). To use your own data, replace the `index_pattern` and field names.\n' +
  '\n' +
  '### How a visualization is structured\n' +
  '\n' +
  'Every visualization requires at minimum:\n' +
  '\n' +
  '- **`type`**: the chart to render. Each chart type has its own required fields, so the full structure of the request body depends on which `type` you specify.\n' +
  '- **`data_source`**: how data is fetched. You can reference an existing Kibana data view by ID (`"type": "data_view_reference"`), define a data view inline using an index pattern (`"type": "data_view_spec"`), or use an ES|QL query (`"type": "esql"`). Note that ES|QL is only supported via the [Dashboards API](dashboards#tag/Dashboards/operation/post-dashboards). For most chart types, `data_source` is a top-level field. For XY charts, it belongs inside each layer in `layers[]`.\n' +
  '\n' +
  'You can also include `query` and `filters` to apply KQL or Lucene filters to all chart data. Both are optional and can be omitted.\n' +
  '\n' +
  'Everything else is chart-specific: `layers` for XY charts, `metrics` for metric charts, and so on. Refer to the request schema on the [Create a visualization](#operation/post-visualizations) endpoint for the full shape of each type.\n' +
  '\n' +
  '### Chart types\n' +
  '\n' +
  'The `type` field in the request body determines the chart type:\n' +
  '\n' +
  '| Type | Chart | Documentation |\n' +
  '|------|-------|---------------|\n' +
  '| `data_table` | Data table | [Table](https://www.elastic.co/docs/explore-analyze/visualize/charts/tables) |\n' +
  '| `gauge` | Gauge (bullet, circular) | [Gauge](https://www.elastic.co/docs/explore-analyze/visualize/charts/gauge-charts) |\n' +
  '| `heatmap` | Heat map | [Heat map](https://www.elastic.co/docs/explore-analyze/visualize/charts/heat-map-charts) |\n' +
  '| `metric` | Single value metric | [Metric](https://www.elastic.co/docs/explore-analyze/visualize/charts/metric-charts) |\n' +
  '| `mosaic` | Mosaic | [Mosaic](https://www.elastic.co/docs/explore-analyze/visualize/charts/mosaic-charts) |\n' +
  '| `pie` | Pie or donut (use `donut_hole` to control the hole size) | [Pie](https://www.elastic.co/docs/explore-analyze/visualize/charts/pie-charts) |\n' +
  '| `region_map` | Region map (choropleth) | [Region map](https://www.elastic.co/docs/explore-analyze/visualize/charts/region-map-charts) |\n' +
  '| `tag_cloud` | Tag cloud | [Tag cloud](https://www.elastic.co/docs/explore-analyze/visualize/charts/tag-cloud-charts) |\n' +
  '| `treemap` | Treemap | [Treemap](https://www.elastic.co/docs/explore-analyze/visualize/charts/treemap-charts) |\n' +
  '| `waffle` | Waffle | [Waffle](https://www.elastic.co/docs/explore-analyze/visualize/charts/waffle-charts) |\n' +
  '| `xy` | Bar, line, area (and stacked/percentage variants) | [Bar](https://www.elastic.co/docs/explore-analyze/visualize/charts/bar-charts), [Line](https://www.elastic.co/docs/explore-analyze/visualize/charts/line-charts), [Area](https://www.elastic.co/docs/explore-analyze/visualize/charts/area-charts) |\n';

const lensCreateCodeSamples = [
  {
    lang: 'cURL',
    label: 'Create a metric visualization - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "metric",\n' +
      '  "title": "Total requests",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a metric visualization - Console',
    source:
      'POST kbn:/api/visualizations\n' +
      '{\n' +
      '  "type": "metric",\n' +
      '  "title": "Total requests",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
  {
    lang: 'cURL',
    label: 'Create an XY line chart - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "xy",\n' +
      '  "title": "Log entries over time",\n' +
      '  "layers": [\n' +
      '    {\n' +
      '      "type": "line",\n' +
      '      "data_source": {\n' +
      '        "type": "data_view_spec",\n' +
      '        "index_pattern": "kibana_sample_data_logs",\n' +
      '        "time_field": "timestamp"\n' +
      '      },\n' +
      '      "x": {\n' +
      '        "operation": "date_histogram",\n' +
      '        "field": "timestamp"\n' +
      '      },\n' +
      '      "y": [\n' +
      '        {\n' +
      '          "operation": "count"\n' +
      '        }\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create an XY line chart - Console',
    source:
      'POST kbn:/api/visualizations\n' +
      '{\n' +
      '  "type": "xy",\n' +
      '  "title": "Log entries over time",\n' +
      '  "layers": [\n' +
      '    {\n' +
      '      "type": "line",\n' +
      '      "data_source": {\n' +
      '        "type": "data_view_spec",\n' +
      '        "index_pattern": "kibana_sample_data_logs",\n' +
      '        "time_field": "timestamp"\n' +
      '      },\n' +
      '      "x": {\n' +
      '        "operation": "date_histogram",\n' +
      '        "field": "timestamp"\n' +
      '      },\n' +
      '      "y": [\n' +
      '        {\n' +
      '          "operation": "count"\n' +
      '        }\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
  {
    lang: 'cURL',
    label: 'Create a pie/donut chart - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "pie",\n' +
      '  "title": "Requests by response code",\n' +
      '  "donut_hole": "m",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ],\n' +
      '  "group_by": [\n' +
      '    {\n' +
      '      "operation": "terms",\n' +
      '      "fields": [\n' +
      '        "response.keyword"\n' +
      '      ],\n' +
      '      "limit": 5\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a pie/donut chart - Console',
    source:
      'POST kbn:/api/visualizations\n' +
      '{\n' +
      '  "type": "pie",\n' +
      '  "title": "Requests by response code",\n' +
      '  "donut_hole": "m",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ],\n' +
      '  "group_by": [\n' +
      '    {\n' +
      '      "operation": "terms",\n' +
      '      "fields": [\n' +
      '        "response.keyword"\n' +
      '      ],\n' +
      '      "limit": 5\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
  {
    lang: 'cURL',
    label: 'Create a data table - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "data_table",\n' +
      '  "title": "Top response codes",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ],\n' +
      '  "rows": [\n' +
      '    {\n' +
      '      "operation": "terms",\n' +
      '      "fields": [\n' +
      '        "response.keyword"\n' +
      '      ],\n' +
      '      "limit": 5\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a data table - Console',
    source:
      'POST kbn:/api/visualizations\n' +
      '{\n' +
      '  "type": "data_table",\n' +
      '  "title": "Top response codes",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ],\n' +
      '  "rows": [\n' +
      '    {\n' +
      '      "operation": "terms",\n' +
      '      "fields": [\n' +
      '        "response.keyword"\n' +
      '      ],\n' +
      '      "limit": 5\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
  {
    lang: 'cURL',
    label: 'Create a visualization using a library data view - cURL',
    source:
      'curl -X POST "${KIBANA_URL}/api/visualizations" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "metric",\n' +
      '  "title": "Total requests (library data view)",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_reference",\n' +
      '    "ref_id": "90943e30-9a47-11e8-b64d-95841ca0b247"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Create a visualization using a library data view - Console',
    source:
      'POST kbn:/api/visualizations\n' +
      '{\n' +
      '  "type": "metric",\n' +
      '  "title": "Total requests (library data view)",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_reference",\n' +
      '    "ref_id": "90943e30-9a47-11e8-b64d-95841ca0b247"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
];

const lensSearchCodeSamples = [
  {
    lang: 'cURL',
    label: 'Search visualizations - cURL',
    source:
      'curl -X GET "${KIBANA_URL}/api/visualizations?query=requests&per_page=10" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}"\n',
  },
  {
    lang: 'Console',
    label: 'Search visualizations - Console',
    source: 'GET kbn:/api/visualizations?query=requests&per_page=10\n',
  },
];

const lensReadCodeSamples = [
  {
    lang: 'cURL',
    label: 'Get a visualization - cURL',
    source:
      'curl -X GET "${KIBANA_URL}/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}"\n',
  },
  {
    lang: 'Console',
    label: 'Get a visualization - Console',
    source: 'GET kbn:/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d\n',
  },
];

const lensUpdateCodeSamples = [
  {
    lang: 'cURL',
    label: 'Update a visualization - cURL',
    source:
      'curl -X PUT "${KIBANA_URL}/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      "  -d '{\n" +
      '  "type": "metric",\n' +
      '  "title": "Total requests (updated)",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      "}'\n",
  },
  {
    lang: 'Console',
    label: 'Update a visualization - Console',
    source:
      'PUT kbn:/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d\n' +
      '{\n' +
      '  "type": "metric",\n' +
      '  "title": "Total requests (updated)",\n' +
      '  "data_source": {\n' +
      '    "type": "data_view_spec",\n' +
      '    "index_pattern": "kibana_sample_data_logs",\n' +
      '    "time_field": "timestamp"\n' +
      '  },\n' +
      '  "metrics": [\n' +
      '    {\n' +
      '      "type": "primary",\n' +
      '      "operation": "count"\n' +
      '    }\n' +
      '  ]\n' +
      '}\n',
  },
];

const lensDeleteCodeSamples = [
  {
    lang: 'cURL',
    label: 'Delete a visualization - cURL',
    source:
      'curl -X DELETE "${KIBANA_URL}/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}" \\\n' +
      '  -H "kbn-xsrf: true"\n',
  },
  {
    lang: 'Console',
    label: 'Delete a visualization - Console',
    source: 'DELETE kbn:/api/visualizations/1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d\n',
  },
];

const lensCreateRequestExamples = {
  createMetricVisualization: {
    summary: 'Create a metric visualization',
    value: {
      type: 'metric',
      title: 'Total requests',
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'kibana_sample_data_logs',
        time_field: 'timestamp',
      },
      sampling: 1,
      ignore_global_filters: false,
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          empty_as_null: false,
        },
      ],
    } satisfies LensCreateRequestBody,
  },
  createXYVisualization: {
    summary: 'Create an XY line chart',
    value: {
      type: 'xy',
      title: 'Log entries over time',
      layers: [
        {
          type: 'line',
          data_source: {
            type: 'data_view_spec',
            index_pattern: 'kibana_sample_data_logs',
            time_field: 'timestamp',
          },
          sampling: 1,
          ignore_global_filters: false,
          x: {
            operation: 'date_histogram',
            field: 'timestamp',
            suggested_interval: 'auto',
            use_original_time_range: false,
            include_empty_rows: true,
            drop_partial_intervals: false,
          },
          y: [
            {
              operation: 'count',
              empty_as_null: false,
            },
          ],
        },
      ],
    } satisfies LensCreateRequestBody,
  },
  createPieVisualization: {
    summary: 'Create a pie/donut chart',
    value: {
      type: 'pie',
      title: 'Requests by response code',
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'kibana_sample_data_logs',
        time_field: 'timestamp',
      },
      sampling: 1,
      ignore_global_filters: false,
      metrics: [
        {
          operation: 'count',
          empty_as_null: false,
        },
      ],
      group_by: [
        {
          operation: 'terms',
          fields: ['response.keyword'],
          limit: 5,
        },
      ],
      styling: {
        values: {
          visible: true,
          mode: 'percentage',
        },
        donut_hole: 'm',
        labels: {
          visible: true,
          position: 'outside',
        },
      },
    } satisfies LensCreateRequestBody,
  },
  createDataTableVisualization: {
    summary: 'Create a data table',
    value: {
      type: 'data_table',
      title: 'Top response codes',
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'kibana_sample_data_logs',
        time_field: 'timestamp',
      },
      sampling: 1,
      ignore_global_filters: false,
      metrics: [
        {
          operation: 'count',
          empty_as_null: false,
        },
      ],
      rows: [
        {
          operation: 'terms',
          fields: ['response.keyword'],
          limit: 5,
        },
      ],
    } satisfies LensCreateRequestBody,
  },
  createDataViewReferenceVisualization: {
    summary: 'Create a visualization using a library data view',
    value: {
      type: 'metric',
      title: 'Total requests (library data view)',
      data_source: {
        type: 'data_view_reference',
        ref_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      },
      sampling: 1,
      ignore_global_filters: false,
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          empty_as_null: false,
        },
      ],
    } satisfies LensCreateRequestBody,
  },
};

const lensCreateResponseExamples = {
  createMetricVisualizationResponse: {
    summary: 'Create a metric visualization',
    description:
      'Response after creating a metric chart (count of requests) using an inline data view. Server-populated defaults are included in the response.\n',
    value: {
      id: '1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d',
      data: {
        title: 'Total requests',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        type: 'metric',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
          },
        ],
        styling: {
          primary: {
            position: 'bottom',
            labels: {
              alignment: 'left',
            },
            value: {
              sizing: 'auto',
              alignment: 'right',
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T10:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:00:00.000Z',
        version: 'WzU5LDFd',
      },
    } satisfies LensCreateResponseBody,
  },
  createXYVisualizationResponse: {
    summary: 'Create an XY line chart',
    description:
      'Response after creating an XY line chart. The response includes server-populated defaults for axis configuration, styling, and legend.\n',
    value: {
      id: '3a7c2e10-b3c5-11ef-bd7a-2b6b1a8c0f3d',
      data: {
        title: 'Log entries over time',
        type: 'xy',
        layers: [
          {
            type: 'line',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            sampling: 1,
            ignore_global_filters: false,
            x: {
              operation: 'date_histogram',
              field: 'timestamp',
              suggested_interval: 'auto',
              use_original_time_range: false,
              include_empty_rows: true,
              drop_partial_intervals: false,
            },
            y: [
              {
                operation: 'count',
                empty_as_null: false,
                axis: 'y',
              },
            ],
          },
        ],
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
            domain: {
              type: 'fit',
              rounding: false,
            },
            labels: {
              orientation: 'horizontal',
            },
          },
          y: {
            title: {
              visible: true,
            },
            scale: 'linear',
            ticks: {
              visible: true,
            },
            grid: {
              visible: true,
            },
            domain: {
              type: 'full',
              rounding: true,
            },
            labels: {
              orientation: 'horizontal',
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
        },
        legend: {
          visibility: 'hidden',
          placement: 'outside',
          position: 'right',
          layout: {
            type: 'grid',
            truncate: {
              max_lines: 1,
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T10:05:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:05:00.000Z',
        version: 'WzYwLDFd',
      },
    } satisfies LensCreateResponseBody,
  },
  createPieVisualizationResponse: {
    summary: 'Create a pie/donut chart',
    description:
      'Response after creating a donut chart broken down by response code. Note that `group_by` items gain a server-populated `rank_by` sort order, and `legend`, `values`, and `labels` are populated with defaults.\n',
    value: {
      id: '2cac466f-ff49-4d34-8d69-487a93a179c2',
      data: {
        title: 'Requests by response code',
        type: 'pie',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
        group_by: [
          {
            operation: 'terms',
            fields: ['response.keyword'],
            limit: 5,
            rank_by: {
              type: 'metric',
              metric_index: 0,
              direction: 'desc',
            },
          },
        ],
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        legend: {
          visibility: 'auto',
        },
        styling: {
          values: {
            visible: true,
            mode: 'percentage',
          },
          donut_hole: 'm',
          labels: {
            visible: true,
            position: 'outside',
          },
        },
      },
      meta: {
        created_at: '2026-04-13T10:10:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:10:00.000Z',
        version: 'Wzc3LDFd',
      },
    } satisfies LensCreateResponseBody,
  },
  createDataTableVisualizationResponse: {
    summary: 'Create a data table',
    description:
      'Response after creating a data table broken down by response code. Note that `rows` items gain a server-populated `rank_by` sort order.\n',
    value: {
      id: '83660652-bc77-46a1-8dca-5d512949eba6',
      data: {
        title: 'Top response codes',
        type: 'data_table',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
        rows: [
          {
            operation: 'terms',
            fields: ['response.keyword'],
            limit: 5,
            rank_by: {
              type: 'metric',
              metric_index: 0,
              direction: 'desc',
            },
          },
        ],
      },
      meta: {
        created_at: '2026-04-13T10:15:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:15:00.000Z',
        version: 'Wzc4LDFd',
      },
    } satisfies LensCreateResponseBody,
  },
  createDataViewReferenceResponse: {
    summary: 'Create a visualization using a library data view',
    description:
      'Response after creating a metric chart that references an existing saved data view by ID (`ref_id`) instead of defining an inline index pattern.\n',
    value: {
      id: 'cc44837a-7f20-42ee-b317-9af4f5eacc9c',
      data: {
        title: 'Total requests (library data view)',
        data_source: {
          type: 'data_view_reference',
          ref_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        },
        type: 'metric',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
          },
        ],
        styling: {
          primary: {
            position: 'bottom',
            labels: {
              alignment: 'left',
            },
            value: {
              sizing: 'auto',
              alignment: 'right',
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T10:20:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:20:00.000Z',
        version: 'Wzc5LDFd',
      },
    } satisfies LensCreateResponseBody,
  },
};

const lensSearchResponseExamples = {
  searchVisualizationsResponse: {
    summary: 'Search visualizations response',
    description:
      'Paginated list of visualizations matching the query. Each item includes the ID, full chart configuration, and metadata. Use the GET endpoint to retrieve a single visualization by ID.\n',
    value: {
      data: [
        {
          id: '1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d',
          data: {
            title: 'Total requests',
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'kibana_sample_data_logs',
              time_field: 'timestamp',
            },
            type: 'metric',
            sampling: 1,
            ignore_global_filters: false,
            metrics: [
              {
                type: 'primary',
                operation: 'count',
                empty_as_null: false,
              },
            ],
            styling: {
              primary: {
                position: 'bottom',
                labels: {
                  alignment: 'left',
                },
                value: {
                  sizing: 'auto',
                  alignment: 'right',
                },
              },
            },
          },
          meta: {
            created_at: '2026-04-13T10:00:00.000Z',
            managed: false,
            updated_at: '2026-04-13T10:00:00.000Z',
            version: 'WzU5LDFd',
          },
        },
        {
          id: '3a7c2e10-b3c5-11ef-bd7a-2b6b1a8c0f3d',
          data: {
            title: 'Log entries over time',
            type: 'xy',
            layers: [
              {
                type: 'line',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'kibana_sample_data_logs',
                  time_field: 'timestamp',
                },
                sampling: 1,
                ignore_global_filters: false,
                x: {
                  operation: 'date_histogram',
                  field: 'timestamp',
                  suggested_interval: 'auto',
                  use_original_time_range: false,
                  include_empty_rows: true,
                  drop_partial_intervals: false,
                },
                y: [
                  {
                    operation: 'count',
                    empty_as_null: false,
                    axis: 'y',
                  },
                ],
              },
            ],
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
                domain: {
                  type: 'fit',
                  rounding: false,
                },
                labels: {
                  orientation: 'horizontal',
                },
              },
              y: {
                title: {
                  visible: true,
                },
                scale: 'linear',
                ticks: {
                  visible: true,
                },
                grid: {
                  visible: true,
                },
                domain: {
                  type: 'full',
                  rounding: true,
                },
                labels: {
                  orientation: 'horizontal',
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
            },
            legend: {
              visibility: 'hidden',
              placement: 'outside',
              position: 'right',
              layout: {
                type: 'grid',
                truncate: {
                  max_lines: 1,
                },
              },
            },
          },
          meta: {
            created_at: '2026-04-13T10:05:00.000Z',
            managed: false,
            updated_at: '2026-04-13T10:05:00.000Z',
            version: 'WzYwLDFd',
          },
        },
      ],
      meta: {
        page: 1,
        per_page: 20,
        total: 2,
      },
    } satisfies LensSearchResponseBody,
  },
};

const lensGetResponseExamples = {
  getVisualizationResponse: {
    summary: 'Get visualization response',
    description: 'The full visualization state including the chart configuration and metadata.\n',
    value: {
      id: '1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d',
      data: {
        title: 'Total requests',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        type: 'metric',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
          },
        ],
        styling: {
          primary: {
            position: 'bottom',
            labels: {
              alignment: 'left',
            },
            value: {
              sizing: 'auto',
              alignment: 'right',
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T10:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T10:00:00.000Z',
        version: 'WzU5LDFd',
      },
    } satisfies LensGetResponseBody,
  },
};

const lensUpdateRequestExamples = {
  updateVisualization: {
    summary: 'Update a visualization',
    value: {
      type: 'metric',
      title: 'Total requests (updated)',
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'kibana_sample_data_logs',
        time_field: 'timestamp',
      },
      sampling: 1,
      ignore_global_filters: false,
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          empty_as_null: false,
        },
      ],
    } satisfies LensUpdateRequestBody,
  },
};

const lensUpdateResponseExamples = {
  updateVisualizationResponse: {
    summary: 'Update visualization response',
    description:
      'The complete updated visualization state after a full replacement. PUT replaces the entire chart configuration - fields omitted from the request are reset to their defaults. `meta.created_at` reflects the update time rather than the original creation time.\n',
    value: {
      id: '1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d',
      data: {
        title: 'Total requests (updated)',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        type: 'metric',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
          },
        ],
        styling: {
          primary: {
            position: 'bottom',
            labels: {
              alignment: 'left',
            },
            value: {
              sizing: 'auto',
              alignment: 'right',
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T11:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T11:00:00.000Z',
        version: 'WzYxLDFd',
      },
    } satisfies LensUpdateResponseBody,
  },
};

const lensUpsertResponseExamples = {
  createdVisualizationResponse: {
    summary: 'Update visualization response',
    description:
      'The created visualization state. Server-populated defaults are included in the response.\n',
    value: {
      id: '1e4f0a30-b3c5-11ef-bd7a-2b6b1a8c0f3d',
      data: {
        title: 'Total requests (updated)',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'kibana_sample_data_logs',
          time_field: 'timestamp',
        },
        type: 'metric',
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
          },
        ],
        styling: {
          primary: {
            position: 'bottom',
            labels: {
              alignment: 'left',
            },
            value: {
              sizing: 'auto',
              alignment: 'right',
            },
          },
        },
      },
      meta: {
        created_at: '2026-04-13T11:00:00.000Z',
        managed: false,
        updated_at: '2026-04-13T11:00:00.000Z',
        version: 'WzYxLDFd',
      },
    } satisfies LensUpdateResponseBody,
  },
};

export const getCreateLensVisualizationOASOperationObject = () => ({
  description: lensVisualizationApiOverviewDescription,
  'x-codeSamples': lensCreateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: lensCreateRequestExamples,
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          examples: lensCreateResponseExamples,
        },
      },
    },
  },
});

export const getSearchLensVisualizationOASOperationObject = () => ({
  'x-codeSamples': lensSearchCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: lensSearchResponseExamples,
        },
      },
    },
  },
});

export const getReadLensVisualizationOASOperationObject = () => ({
  'x-codeSamples': lensReadCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: lensGetResponseExamples,
        },
      },
    },
  },
});

export const getUpdateLensVisualizationOASOperationObject = () => ({
  'x-codeSamples': lensUpdateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: lensUpdateRequestExamples,
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          examples: lensUpdateResponseExamples,
        },
      },
    },
    201: {
      content: {
        'application/json': {
          examples: lensUpsertResponseExamples,
        },
      },
    },
  },
});

export const getDeleteLensVisualizationOASOperationObject = () => ({
  'x-codeSamples': lensDeleteCodeSamples,
});
