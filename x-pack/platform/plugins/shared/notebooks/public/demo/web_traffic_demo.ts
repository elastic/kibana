/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotebookAttributes } from '../../common/types';

/** The [Logs] Web Traffic dashboard rebuilt as a notebook, with its app layout. */
export const WEB_TRAFFIC_DEMO: NotebookAttributes = {
  title: '[Logs] Web Traffic Notebook',
  description: "Analyze mock web traffic log data for Elastic's website",
  cellOrder: [
    '394a8190-bd7a-4e98-964d-72bb241bf72d',
    'fe7d0693-34dd-432f-8c44-174eccb877b4',
    'd779c34c-3ba8-43a3-8c23-0acd72d2c097',
    'fff3461c-d98d-4396-89eb-257060bbf912',
    'ab86df12-74e1-4efe-ab79-519c978b3072',
    '248b0bda-b6fc-454a-9ec9-41a88cf7ba3f',
    'adc98e38-fa75-44b9-bc3c-751930f78075',
    'db84c821-80ef-45cb-a0e0-3d6e95753b1c',
    'a2eefb77-b2a1-46db-a1db-387e07ac6ce1',
    '6ffeb6fb-9bd8-4572-89e7-412e4e6eff95',
    'a0047b6c-b854-4aa2-a782-bbfd58986635',
    'b38d8021-c6c5-40fb-9da4-03a311d1eac5',
    '8c9395bf-c1d8-4e6b-93f4-ef56bf6fe6b8',
    'dab50080-15d8-40d1-b7ca-46cdd97aed22',
    'ef9233d1-1792-49f4-ba87-397941e40a33',
    '9ab372f6-4a5f-4731-9b2b-00d2bafa6e71',
    '6a9749b5-6a8d-491f-8166-bc2c27a24500',
    'cb7eb361-dfe8-4c7b-b970-9d0b99a2eae6',
    'edaa06f0-23da-4a8a-bb34-630c599edf8a',
    'f5cab0d3-a376-47c3-bfd9-9d713cb94c8a',
    '2f727eb8-e64e-480f-a58f-1c36190bb540',
    'f834b00a-b035-47e9-883a-20e78a5e7052',
    '95d4b7da-96d6-458c-a09b-8720d34b92c8',
    'aaba6e68-01cb-495e-976e-c5e7cc69df96',
  ],
  cells: {
    '248b0bda-b6fc-454a-9ec9-41a88cf7ba3f': {
      id: '248b0bda-b6fc-454a-9ec9-41a88cf7ba3f',
      label: 'Visits',
      name: 'esql_1',
      outputNames: {
        table: 'visits',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| STATS\n    `Unique Visitors` = COUNT_DISTINCT(clientip),\n    Visits = COUNT(*)',
      runMode: 'auto',
      type: 'esql',
    },
    '2f727eb8-e64e-480f-a58f-1c36190bb540': {
      id: '2f727eb8-e64e-480f-a58f-1c36190bb540',
      label: 'Bytes distribution data',
      name: 'esql_6',
      outputNames: {
        table: 'bytes_distribution',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| INLINESTATS total_visits = COUNT()\n| STATS visits = COUNT() by bytes = bucket(bytes, 1000, 0, 100000), total_visits\n| EVAL percentage = (TO_DOUBLE(visits) / total_visits)\n| EVAL percentage = ROUND(percentage, 3)\n| DROP total_visits, visits',
      runMode: 'auto',
      type: 'esql',
    },
    '394a8190-bd7a-4e98-964d-72bb241bf72d': {
      id: '394a8190-bd7a-4e98-964d-72bb241bf72d',
      input: {
        defaultValue: {
          from: 'now-7d/d',
          to: 'now',
        },
        kind: 'time',
        pinned: true,
      },
      name: 'time',
      type: 'input',
    },
    '6a9749b5-6a8d-491f-8166-bc2c27a24500': {
      id: '6a9749b5-6a8d-491f-8166-bc2c27a24500',
      label: 'Sankey data',
      name: 'esql_4',
      outputNames: {
        table: 'sankey',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE timestamp >= ?_tstart AND timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| WHERE machine.os.keyword IS NOT NULL AND geo.dest IS NOT NULL\n| STATS size = COUNT(*) BY stk1 = machine.os.keyword, stk2 = geo.dest\n| LIMIT 10000',
      runMode: 'auto',
      type: 'esql',
    },
    '6ffeb6fb-9bd8-4572-89e7-412e4e6eff95': {
      id: '6ffeb6fb-9bd8-4572-89e7-412e4e6eff95',
      label: 'Chart 3',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                'db6b8587-f43b-4576-9bda-02451db0f8c6': {
                  columns: [
                    {
                      columnId: 'HTTP 4xx (%)',
                      customLabel: false,
                      fieldName: 'HTTP 4xx (%)',
                      inMetricDimension: true,
                      label: 'HTTP 4xx (%)',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'HTTP 4xx (%)',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'percent',
                          params: {
                            decimals: 2,
                          },
                        },
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| EVAL response_int = TO_INTEGER(response.keyword)\n| STATS\n    `HTTP 4xx (%)` = ROUND(AVG(CASE(response_int >= 400 AND response_int < 500, 1.0, 0.0)), 3),\n    `HTTP 5xx (%)` = ROUND(AVG(CASE(response_int >= 500, 1.0, 0.0)), 3)',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-db6b8587-f43b-4576-9bda-02451db0f8c6',
              type: 'index-pattern',
            },
          ],
          visualization: {
            density: 'default',
            layerId: 'db6b8587-f43b-4576-9bda-02451db0f8c6',
            layerType: 'data',
            metricAccessor: 'HTTP 4xx (%)',
          },
        },
        title: 'HTTP 4xx (%) & HTTP 5xx (%) of (empty)',
        version: 3,
        visualizationType: 'lnsMetric',
      },
      name: 'chart_3',
      runMode: 'auto',
      sourceCell: 'a2eefb77-b2a1-46db-a1db-387e07ac6ce1',
      type: 'chart',
    },
    '8c9395bf-c1d8-4e6b-93f4-ef56bf6fe6b8': {
      id: '8c9395bf-c1d8-4e6b-93f4-ef56bf6fe6b8',
      label: '[Logs] Response Codes Over Time + Annotations',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                'f73aa880-ea0a-4505-96d6-748073b872ef': {
                  columns: [
                    {
                      columnId: 'Response Code Count',
                      customLabel: false,
                      fieldName: 'Response Code Count',
                      inMetricDimension: true,
                      label: 'Response Code Count',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Response Code Count',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'timestamp',
                      customLabel: false,
                      fieldName: 'timestamp',
                      label: 'timestamp',
                      meta: {
                        esType: 'date',
                        params: {
                          id: 'date',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          params: {},
                          sourceField: 'timestamp',
                        },
                        type: 'date',
                      },
                    },
                    {
                      columnId: 'status',
                      customLabel: false,
                      fieldName: 'status',
                      label: 'status',
                      meta: {
                        esType: 'keyword',
                        params: {
                          id: 'string',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'status',
                        },
                        type: 'string',
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| EVAL code = TO_INTEGER(response.keyword)\n| EVAL status = CASE(\n    code >= 500, "HTTP 5xx",\n    code >= 400, "HTTP 4xx",\n    code >= 200, "HTTP 2xx and 3xx"\n  )\n| WHERE status IS NOT NULL\n| STATS `Response Code Count` = COUNT(*)\n    BY timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend), status\n| SORT timestamp',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-f73aa880-ea0a-4505-96d6-748073b872ef',
              type: 'index-pattern',
            },
          ],
          visualization: {
            areaFill: 'solid',
            axisTitlesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            fillOpacity: 0.5,
            fittingFunction: 'Linear',
            gridlinesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            labelsOrientation: {
              x: 0,
              yLeft: 0,
              yRight: 0,
            },
            layers: [
              {
                accessors: ['Response Code Count'],
                colorMapping: {
                  assignments: [],
                  colorMode: {
                    type: 'categorical',
                  },
                  paletteId: 'default',
                  specialAssignments: [
                    {
                      color: {
                        type: 'loop',
                      },
                      rules: [
                        {
                          type: 'other',
                        },
                      ],
                    },
                  ],
                },
                layerId: 'f73aa880-ea0a-4505-96d6-748073b872ef',
                layerType: 'data',
                seriesType: 'area_percentage_stacked',
                splitAccessors: ['status'],
                xAccessor: 'timestamp',
              },
            ],
            legend: {
              isVisible: true,
              layout: 'list',
              position: 'bottom',
            },
            preferredSeriesType: 'area_stacked',
            tickLabelsVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            valueLabels: 'hide',
          },
        },
        title: 'Bar vertical stacked',
        version: 3,
        visualizationType: 'lnsXY',
      },
      name: 'chart_8',
      runMode: 'auto',
      sourceCell: 'b38d8021-c6c5-40fb-9da4-03a311d1eac5',
      type: 'chart',
    },
    '95d4b7da-96d6-458c-a09b-8720d34b92c8': {
      id: '95d4b7da-96d6-458c-a09b-8720d34b92c8',
      label: 'Error by host data',
      name: 'esql_7',
      outputNames: {
        table: 'error_by_host',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| EVAL response_int = TO_INTEGER(response.keyword)\n| STATS\n    Visits = COUNT(*),\n    Unique = COUNT_DISTINCT(clientip),\n    `95th percentile of bytes` = PERCENTILE(bytes, 95),\n    `Median of bytes` = MEDIAN(bytes),\n    `HTTP 4xx` = ROUND(AVG(CASE(response_int >= 400 AND response_int < 500, 1.0, 0.0)), 3),\n    `HTTP 5xx` = ROUND(AVG(CASE(response_int >= 500, 1.0, 0.0)), 3)\n  BY url.keyword\n| SORT `HTTP 5xx` DESC',
      runMode: 'auto',
      type: 'esql',
    },
    '9ab372f6-4a5f-4731-9b2b-00d2bafa6e71': {
      height: 616,
      id: '9ab372f6-4a5f-4731-9b2b-00d2bafa6e71',
      label: '[Logs] Unique Destination Heatmap',
      name: 'vega_1',
      runMode: 'auto',
      sourceCell: 'ef9233d1-1792-49f4-ba87-397941e40a33',
      spec: '{\n  $schema: https://vega.github.io/schema/vega-lite/v5.json\n  transform: [\n    // Keep the 25 countries with the most documents, like terms size: 25\n    {joinaggregate: [{op: "sum", field: "docs", as: "country_docs"}], groupby: ["country"]}\n    {window: [{op: "dense_rank", as: "rank"}], sort: [{field: "country_docs", order: "descending"}]}\n    {filter: "datum.rank <= 25"}\n  ]\n  mark: rect\n  encoding: {\n    x: {\n      field: hour\n      type: nominal\n      scale: {domain: {expr: "sequence(0, 24)"}}\n      axis: {title: false, labelAngle: 0}\n    }\n    y: {\n      field: country\n      type: nominal\n      sort: {op: "sum", field: "unique", order: "descending"}\n      axis: {title: false}\n    }\n    color: {\n      field: unique\n      type: quantitative\n      title: false\n      scale: {scheme: "blues"}\n    }\n    tooltip: [\n      {field: "unique", title: "Unique visitors"}\n      {field: "country", title: "geo.dest"}\n      {field: "hour", title: "Hour"}\n    ]\n  }\n}',
      type: 'vega',
    },
    'a0047b6c-b854-4aa2-a782-bbfd58986635': {
      id: 'a0047b6c-b854-4aa2-a782-bbfd58986635',
      label: 'Chart 4',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                'db6b8587-f43b-4576-9bda-02451db0f8c6': {
                  columns: [
                    {
                      columnId: 'HTTP 4xx (%)',
                      customLabel: false,
                      fieldName: 'HTTP 5xx (%)',
                      inMetricDimension: true,
                      label: 'HTTP 5xx (%)',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'HTTP 5xx (%)',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'percent',
                          params: {
                            decimals: 2,
                          },
                        },
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| EVAL response_int = TO_INTEGER(response.keyword)\n| STATS\n    `HTTP 4xx (%)` = ROUND(AVG(CASE(response_int >= 400 AND response_int < 500, 1.0, 0.0)), 3),\n    `HTTP 5xx (%)` = ROUND(AVG(CASE(response_int >= 500, 1.0, 0.0)), 3)',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-db6b8587-f43b-4576-9bda-02451db0f8c6',
              type: 'index-pattern',
            },
          ],
          visualization: {
            density: 'default',
            layerId: 'db6b8587-f43b-4576-9bda-02451db0f8c6',
            layerType: 'data',
            metricAccessor: 'HTTP 4xx (%)',
          },
        },
        title: 'HTTP 4xx (%) & HTTP 5xx (%) of (empty)',
        version: 3,
        visualizationType: 'lnsMetric',
      },
      name: 'chart_4',
      runMode: 'auto',
      sourceCell: 'a2eefb77-b2a1-46db-a1db-387e07ac6ce1',
      type: 'chart',
    },
    'a2eefb77-b2a1-46db-a1db-387e07ac6ce1': {
      id: 'a2eefb77-b2a1-46db-a1db-387e07ac6ce1',
      label: 'HTTP Error data',
      name: 'esql_2',
      outputNames: {
        table: 'http_errors',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| EVAL response_int = TO_INTEGER(response.keyword)\n| STATS\n    `HTTP 4xx (%)` = ROUND(AVG(CASE(response_int >= 400 AND response_int < 500, 1.0, 0.0)), 3),\n    `HTTP 5xx (%)` = ROUND(AVG(CASE(response_int >= 500, 1.0, 0.0)), 3)',
      runMode: 'auto',
      type: 'esql',
    },
    'aaba6e68-01cb-495e-976e-c5e7cc69df96': {
      id: 'aaba6e68-01cb-495e-976e-c5e7cc69df96',
      label: '[Logs] Errors by host',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712': {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                '4ef74c2d-9c60-42c3-b82d-ff6bfdcab7d7': {
                  columns: [
                    {
                      columnId: 'Visits',
                      customLabel: false,
                      fieldName: 'Visits',
                      inMetricDimension: true,
                      label: 'Visits',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Visits',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'HTTP 4xx',
                      customLabel: false,
                      fieldName: 'HTTP 4xx',
                      inMetricDimension: true,
                      label: 'HTTP 4xx',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'HTTP 4xx',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'percent',
                          params: {
                            decimals: 1,
                          },
                        },
                      },
                    },
                    {
                      columnId: 'ffed51ac-f258-433d-b024-27612c0d580f',
                      fieldName: 'url.keyword',
                      inMetricDimension: true,
                      label: 'url.keyword',
                      meta: {
                        esType: 'keyword',
                        params: {
                          id: 'string',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: true,
                          sourceField: 'url.keyword',
                        },
                        type: 'string',
                      },
                    },
                    {
                      columnId: 'Unique',
                      customLabel: false,
                      fieldName: 'Unique',
                      inMetricDimension: true,
                      label: 'Unique',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Unique',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: '95th percentile of bytes',
                      customLabel: false,
                      fieldName: '95th percentile of bytes',
                      inMetricDimension: true,
                      label: '95th percentile of bytes',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: '95th percentile of bytes',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'bytes',
                          params: {
                            decimals: 0,
                          },
                        },
                      },
                    },
                    {
                      columnId: 'Median of bytes',
                      customLabel: false,
                      fieldName: 'Median of bytes',
                      inMetricDimension: true,
                      label: 'Median of bytes',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Median of bytes',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'bytes',
                          params: {
                            decimals: 0,
                          },
                        },
                      },
                    },
                    {
                      columnId: 'HTTP 5xx',
                      customLabel: false,
                      fieldName: 'HTTP 5xx',
                      inMetricDimension: true,
                      label: 'HTTP 5xx',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'HTTP 5xx',
                        },
                        type: 'number',
                      },
                      params: {
                        format: {
                          id: 'percent',
                          params: {
                            decimals: 2,
                          },
                        },
                      },
                    },
                  ],
                  index: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n  | KEEP bytes, clientip, url.keyword, response.keyword\n  | EVAL\n      type\n        = CASE(\n          TO_INTEGER(response.keyword) >= 400 AND TO_INTEGER(response.keyword) < 500, "4xx", TO_INTEGER(response.keyword) >= 500,\n          "5xx", "Other")\n  | STATS Visits = COUNT(), Unique = COUNT_DISTINCT(clientip), p95 = PERCENTILE(bytes, 95), median = MEDIAN(bytes) BY type, url.keyword\n  | EVAL count_4xx = CASE(type == "4xx", Visits), count_5xx = CASE(type == "5xx", Visits), count_rest = CASE(type == "Other", Visits)\n  | STATS\n      count_4xx = SUM(count_4xx), count_5xx = SUM(count_5xx), count_rest = SUM(count_rest), Unique = SUM(Unique),\n      `95th percentile of bytes` = MAX(p95), `Median of bytes` = MAX(median), Visits = SUM(Visits)\n        BY url.keyword\n  | EVAL count_4xx = COALESCE(count_4xx, 0::LONG), count_5xx = COALESCE(count_5xx, 0::LONG), count_rest = COALESCE(count_rest, 0::LONG)\n  | EVAL total_records = TO_DOUBLE(count_4xx + count_5xx + count_rest)\n  | EVAL percentage_4xx = count_4xx / total_records, percentage_5xx = count_5xx / total_records\n  | EVAL percentage_4xx = ROUND(percentage_4xx, 3)\n  | EVAL percentage_5xx = ROUND(percentage_5xx, 3)\n  | DROP count_4xx, count_rest, total_records\n  | SORT percentage_5xx DESC\n  | RENAME percentage_4xx AS `HTTP 4xx`, percentage_5xx AS `HTTP 5xx`',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
              name: 'textBasedLanguages-datasource-layer-4ef74c2d-9c60-42c3-b82d-ff6bfdcab7d7',
              type: 'index-pattern',
            },
          ],
          visualization: {
            columns: [
              {
                columnId: 'Unique',
              },
              {
                columnId: '95th percentile of bytes',
              },
              {
                columnId: 'Median of bytes',
              },
              {
                columnId: 'Visits',
              },
              {
                colorMode: 'cell',
                columnId: 'HTTP 4xx',
                palette: {
                  name: 'warm',
                  params: {
                    continuity: 'above',
                    name: 'warm',
                    progression: 'fixed',
                    rangeMax: null,
                    rangeMin: 0,
                    rangeType: 'percent',
                    reverse: false,
                    steps: 5,
                    stops: [
                      {
                        color: '#ffdbd6',
                        stop: 0,
                      },
                      {
                        color: '#ffc2ba',
                        stop: 20,
                      },
                      {
                        color: '#ffa89f',
                        stop: 40,
                      },
                      {
                        color: '#fb8d84',
                        stop: 60,
                      },
                      {
                        color: '#f6726a',
                        stop: 80,
                      },
                    ],
                  },
                  type: 'palette',
                },
              },
              {
                colorMode: 'cell',
                columnId: 'HTTP 5xx',
                palette: {
                  name: 'warm',
                  params: {
                    continuity: 'above',
                    name: 'warm',
                    progression: 'fixed',
                    rangeMax: null,
                    rangeMin: 0,
                    rangeType: 'percent',
                    reverse: false,
                    steps: 5,
                    stops: [
                      {
                        color: '#ffdbd6',
                        stop: 0,
                      },
                      {
                        color: '#ffc2ba',
                        stop: 20,
                      },
                      {
                        color: '#ffa89f',
                        stop: 40,
                      },
                      {
                        color: '#fb8d84',
                        stop: 60,
                      },
                      {
                        color: '#f6726a',
                        stop: 80,
                      },
                    ],
                  },
                  type: 'palette',
                },
              },
              {
                columnId: 'ffed51ac-f258-433d-b024-27612c0d580f',
                isMetric: true,
                isTransposed: false,
              },
            ],
            layerId: '4ef74c2d-9c60-42c3-b82d-ff6bfdcab7d7',
            layerType: 'data',
            showRowNumbers: false,
          },
        },
        title:
          'Unique & 95th percentile of bytes & Median of bytes & Visits & count_5xx & HTTP 4xx & HTTP 5xx of url.keyword',
        version: 3,
        visualizationType: 'lnsDatatable',
      },
      name: 'chart_7',
      runMode: 'auto',
      sourceCell: '95d4b7da-96d6-458c-a09b-8720d34b92c8',
      type: 'chart',
    },
    'ab86df12-74e1-4efe-ab79-519c978b3072': {
      content:
        '## Sample Logs Data\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html).',
      id: 'ab86df12-74e1-4efe-ab79-519c978b3072',
      label: 'Markdown 1',
      name: 'notes_1',
      type: 'markdown',
    },
    'adc98e38-fa75-44b9-bc3c-751930f78075': {
      id: 'adc98e38-fa75-44b9-bc3c-751930f78075',
      label: 'Chart 1',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                '6b340e50-eb3b-47ad-9800-8ff9ddfc3ac8': {
                  columns: [
                    {
                      columnId: 'Visits',
                      customLabel: false,
                      fieldName: 'Visits',
                      inMetricDimension: true,
                      label: 'Visits',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Visits',
                        },
                        type: 'number',
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-6b340e50-eb3b-47ad-9800-8ff9ddfc3ac8',
              type: 'index-pattern',
            },
          ],
          visualization: {
            density: 'default',
            layerId: '6b340e50-eb3b-47ad-9800-8ff9ddfc3ac8',
            layerType: 'data',
            metricAccessor: 'Visits',
          },
        },
        title: 'Visits',
        version: 3,
        visualizationType: 'lnsMetric',
      },
      name: 'chart_1',
      runMode: 'auto',
      sourceCell: '248b0bda-b6fc-454a-9ec9-41a88cf7ba3f',
      type: 'chart',
    },
    'b38d8021-c6c5-40fb-9da4-03a311d1eac5': {
      id: 'b38d8021-c6c5-40fb-9da4-03a311d1eac5',
      label: 'Response codes data',
      name: 'esql_8',
      outputNames: {
        table: 'response_codes',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| EVAL code = TO_INTEGER(response.keyword)\n| EVAL status = CASE(\n    code >= 500, "HTTP 5xx",\n    code >= 400, "HTTP 4xx",\n    code >= 200, "HTTP 2xx and 3xx"\n  )\n| WHERE status IS NOT NULL\n| STATS `Response Code Count` = COUNT(*) BY timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend), status\n| EVAL status_order = CASE(\n    status == "HTTP 2xx and 3xx", 1,\n    status == "HTTP 4xx", 2,\n    status == "HTTP 5xx", 3\n  )\n| SORT status_order ASC\n| DROP status_order',
      runMode: 'auto',
      type: 'esql',
    },
    'cb7eb361-dfe8-4c7b-b970-9d0b99a2eae6': {
      id: 'cb7eb361-dfe8-4c7b-b970-9d0b99a2eae6',
      label: '[Logs] Machine OS and Destination Sankey Chart',
      name: 'vega_2',
      runMode: 'auto',
      sourceCell: '6a9749b5-6a8d-491f-8166-bc2c27a24500',
      spec: '{ \n $schema: https://vega.github.io/schema/vega/v5.json\n  data: [\n\t{\n  \t// query ES based on the currently selected time range and filter string\n  \tname: rawData\n    source: table\n  \t// url: {\n    // \t%context%: true\n    // \t%timefield%: timestamp\n    // \tindex: kibana_sample_data_logs\n    // \tbody: {\n    //   \tsize: 0\n    //   \taggs: {\n    //     \ttable: {\n    //       \tcomposite: {\n    //         \tsize: 10000\n    //         \tsources: [\n    //           \t{\n    //             \tstk1: {\n    //               \tterms: {field: "machine.os.keyword"}\n    //             \t}\n    //           \t}\n    //           \t{\n    //             \tstk2: {\n    //               \tterms: {field: "geo.dest"}\n    //             \t}\n    //           \t}\n    //         \t]\n    //       \t}\n    //     \t}\n    //   \t}\n    // \t}\n  \t// }\n  \t// // From the result, take just the data we are interested in\n  \t// format: {property: "aggregations.table.buckets"}\n  \t// // Convert key.stk1 -> stk1 for simpler access below\n  \t// transform: [\n    // \t{type: "formula", expr: "datum.key.stk1", as: "stk1"}\n    // \t{type: "formula", expr: "datum.key.stk2", as: "stk2"}\n    // \t{type: "formula", expr: "datum.doc_count", as: "size"}\n  \t// ]\n\t}\n\t{\n  \tname: nodes\n  \tsource: rawData\n  \ttransform: [\n    \t// when a country is selected, filter out unrelated data\n    \t{\n      \ttype: filter\n      \texpr: !groupSelector || groupSelector.stk1 == datum.stk1 || groupSelector.stk2 == datum.stk2\n    \t}\n    \t// Set new key for later lookups - identifies each node\n    \t{type: "formula", expr: "datum.stk1+datum.stk2", as: "key"}\n    \t// instead of each table row, create two new rows,\n    \t// one for the source (stack=stk1) and one for destination node (stack=stk2).\n    \t// The country code stored in stk1 and stk2 fields is placed into grpId field.\n    \t{\n      \ttype: fold\n      \tfields: ["stk1", "stk2"]\n      \tas: ["stack", "grpId"]\n    \t}\n    \t// Create a sortkey, different for stk1 and stk2 stacks.\n    \t{\n      \ttype: formula\n      \texpr: datum.stack == \'stk1\' ? datum.stk1+datum.stk2 : datum.stk2+datum.stk1\n      \tas: sortField\n    \t}\n    \t// Calculate y0 and y1 positions for stacking nodes one on top of the other,\n    \t// independently for each stack, and ensuring they are in the proper order,\n    \t// alphabetical from the top (reversed on the y axis)\n    \t{\n      \ttype: stack\n      \tgroupby: ["stack"]\n      \tsort: {field: "sortField", order: "descending"}\n      \tfield: size\n    \t}\n    \t// calculate vertical center point for each node, used to draw edges\n    \t{type: "formula", expr: "(datum.y0+datum.y1)/2", as: "yc"}\n  \t]\n\t}\n\t{\n  \tname: groups\n  \tsource: nodes\n  \ttransform: [\n    \t// combine all nodes into country groups, summing up the doc counts\n    \t{\n      \ttype: aggregate\n      \tgroupby: ["stack", "grpId"]\n      \tfields: ["size"]\n      \tops: ["sum"]\n      \tas: ["total"]\n    \t}\n    \t// re-calculate the stacking y0,y1 values\n    \t{\n      \ttype: stack\n      \tgroupby: ["stack"]\n      \tsort: {field: "grpId", order: "descending"}\n      \tfield: total\n    \t}\n    \t// project y0 and y1 values to screen coordinates\n    \t// doing it once here instead of doing it several times in marks\n    \t{type: "formula", expr: "scale(\'y\', datum.y0)", as: "scaledY0"}\n    \t{type: "formula", expr: "scale(\'y\', datum.y1)", as: "scaledY1"}\n    \t// boolean flag if the label should be on the right of the stack\n    \t{type: "formula", expr: "datum.stack == \'stk1\'", as: "rightLabel"}\n    \t// Calculate traffic percentage for this country using "y" scale\n    \t// domain upper bound, which represents the total traffic\n    \t{\n      \ttype: formula\n      \texpr: datum.total/domain(\'y\')[1]\n      \tas: percentage\n    \t}\n  \t]\n\t}\n\t{\n  \t// This is a temp lookup table with all the \'stk2\' stack nodes\n  \tname: destinationNodes\n  \tsource: nodes\n  \ttransform: [\n    \t{type: "filter", expr: "datum.stack == \'stk2\'"}\n  \t]\n\t}\n\t{\n  \tname: edges\n  \tsource: nodes\n  \ttransform: [\n    \t// we only want nodes from the left stack\n    \t{type: "filter", expr: "datum.stack == \'stk1\'"}\n    \t// find corresponding node from the right stack, keep it as "target"\n    \t{\n      \ttype: lookup\n      \tfrom: destinationNodes\n      \tkey: key\n      \tfields: ["key"]\n      \tas: ["target"]\n    \t}\n    \t// calculate SVG link path between stk1 and stk2 stacks for the node pair\n    \t{\n      \ttype: linkpath\n      \torient: horizontal\n      \tshape: diagonal\n      \tsourceY: {expr: "scale(\'y\', datum.yc)"}\n      \tsourceX: {expr: "scale(\'x\', \'stk1\') + bandwidth(\'x\')"}\n      \ttargetY: {expr: "scale(\'y\', datum.target.yc)"}\n      \ttargetX: {expr: "scale(\'x\', \'stk2\')"}\n    \t}\n    \t// A little trick to calculate the thickness of the line.\n    \t// The value needs to be the same as the hight of the node, but scaling\n    \t// size to screen\'s height gives inversed value because screen\'s Y\n    \t// coordinate goes from the top to the bottom, whereas the graph\'s Y=0\n    \t// is at the bottom. So subtracting scaled doc count from screen height\n    \t// (which is the "lower" bound of the "y" scale) gives us the right value\n    \t{\n      \ttype: formula\n      \texpr: range(\'y\')[0]-scale(\'y\', datum.size)\n      \tas: strokeWidth\n    \t}\n    \t// Tooltip needs individual link\'s percentage of all traffic\n    \t{\n      \ttype: formula\n      \texpr: datum.size/domain(\'y\')[1]\n      \tas: percentage\n    \t}\n  \t]\n\t}\n  ]\n  scales: [\n\t{\n  \t// calculates horizontal stack positioning\n  \tname: x\n  \ttype: band\n  \trange: width\n  \tdomain: ["stk1", "stk2"]\n  \tpaddingOuter: 0.05\n  \tpaddingInner: 0.95\n\t}\n\t{\n  \t// this scale goes up as high as the highest y1 value of all nodes\n  \tname: y\n  \ttype: linear\n  \trange: height\n  \tdomain: {data: "nodes", field: "y1"}\n\t}\n\t{\n  \t// use rawData to ensure the colors stay the same when clicking.\n  \tname: color\n  \ttype: ordinal\n  \trange: category\n  \tdomain: {data: "rawData", field: "stk1"}\n\t}\n\t{\n  \t// this scale is used to map internal ids (stk1, stk2) to stack names\n  \tname: stackNames\n  \ttype: ordinal\n  \trange: ["Source", "Destination"]\n  \tdomain: ["stk1", "stk2"]\n\t}\n  ]\n  axes: [\n\t{\n  \t// x axis should use custom label formatting to print proper stack names\n  \torient: bottom\n  \tscale: x\n  \tencode: {\n    \tlabels: {\n      \tupdate: {\n        \ttext: {scale: "stackNames", field: "value"}\n      \t}\n    \t}\n  \t}\n\t}\n\t{orient: "left", scale: "y"}\n  ]\n  marks: [\n\t{\n  \t// draw the connecting line between stacks\n  \ttype: path\n  \tname: edgeMark\n  \tfrom: {data: "edges"}\n  \t// this prevents some autosizing issues with large strokeWidth for paths\n  \tclip: true\n  \tencode: {\n    \tupdate: {\n      \t// By default use color of the left node, except when showing traffic\n      \t// from just one country, in which case use destination color.\n      \tstroke: [\n        \t{\n          \ttest: groupSelector && groupSelector.stack==\'stk1\'\n          \tscale: color\n          \tfield: stk2\n        \t}\n        \t{scale: "color", field: "stk1"}\n      \t]\n      \tstrokeWidth: {field: "strokeWidth"}\n      \tpath: {field: "path"}\n      \t// when showing all traffic, and hovering over a country,\n      \t// highlight the traffic from that country.\n      \tstrokeOpacity: {\n        \tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 0.9 : 0.3\n      \t}\n      \t// Ensure that the hover-selected edges show on top\n      \tzindex: {\n        \tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 1 : 0\n      \t}\n      \t// format tooltip string\n      \ttooltip: {\n        \tsignal: datum.stk1 + \' → \' + datum.stk2 + \'\t\' + format(datum.size, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\n      \t}\n    \t}\n    \t// Simple mouseover highlighting of a single line\n    \thover: {\n      \tstrokeOpacity: {value: 1}\n    \t}\n  \t}\n\t}\n\t{\n  \t// draw stack groups (countries)\n  \ttype: rect\n  \tname: groupMark\n  \tfrom: {data: "groups"}\n  \tencode: {\n    \tenter: {\n      \tfill: {scale: "color", field: "grpId"}\n      \twidth: {scale: "x", band: 1}\n    \t}\n    \tupdate: {\n      \tx: {scale: "x", field: "stack"}\n      \ty: {field: "scaledY0"}\n      \ty2: {field: "scaledY1"}\n      \tfillOpacity: {value: 0.6}\n      \ttooltip: {\n        \tsignal: datum.grpId + \'   \' + format(datum.total, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\n      \t}\n    \t}\n    \thover: {\n      \tfillOpacity: {value: 1}\n    \t}\n  \t}\n\t}\n\t{\n  \t// draw country code labels on the inner side of the stack\n  \ttype: text\n  \tfrom: {data: "groups"}\n  \t// don\'t process events for the labels - otherwise line mouseover is unclean\n  \tinteractive: false\n  \tencode: {\n    \tupdate: {\n      \t// depending on which stack it is, position x with some padding\n      \tx: {\n        \tsignal: scale(\'x\', datum.stack) + (datum.rightLabel ? bandwidth(\'x\') + 8 : -8)\n      \t}\n      \t// middle of the group\n      \tyc: {signal: "(datum.scaledY0 + datum.scaledY1)/2"}\n      \talign: {signal: "datum.rightLabel ? \'left\' : \'right\'"}\n      \tbaseline: {value: "middle"}\n      \tfontWeight: {value: "bold"}\n      \t// only show text label if the group\'s height is large enough\n      \ttext: {signal: "abs(datum.scaledY0-datum.scaledY1) > 13 ? datum.grpId : \'\'"}\n    \t}\n  \t}\n\t}\n\t{\n  \t// Create a "show all" button. Shown only when a country is selected.\n  \ttype: group\n  \tdata: [\n    \t// We need to make the button show only when groupSelector signal is true.\n    \t// Each mark is drawn as many times as there are elements in the backing data.\n    \t// Which means that if values list is empty, it will not be drawn.\n    \t// Here I create a data source with one empty object, and filter that list\n    \t// based on the signal value. This can only be done in a group.\n    \t{\n      \tname: dataForShowAll\n      \tvalues: [{}]\n      \ttransform: [{type: "filter", expr: "groupSelector"}]\n    \t}\n  \t]\n  \t// Set button size and positioning\n  \tencode: {\n    \tenter: {\n      \txc: {signal: "width/2"}\n      \ty: {value: 30}\n      \twidth: {value: 80}\n      \theight: {value: 30}\n    \t}\n  \t}\n  \tmarks: [\n    \t{\n      \t// This group is shown as a button with rounded corners.\n      \ttype: group\n      \t// mark name allows signal capturing\n      \tname: groupReset\n      \t// Only shows button if dataForShowAll has values.\n      \tfrom: {data: "dataForShowAll"}\n      \tencode: {\n        \tenter: {\n          \tcornerRadius: {value: 6}\n          \tfill: {value: "#F5F7FA"}\n          \tstroke: {value: "#c1c1c1"}\n          \tstrokeWidth: {value: 2}\n          \t// use parent group\'s size\n          \theight: {\n            \tfield: {group: "height"}\n          \t}\n          \twidth: {\n            \tfield: {group: "width"}\n          \t}\n        \t}\n        \tupdate: {\n          \t// groups are transparent by default\n          \topacity: {value: 1}\n        \t}\n        \thover: {\n          \topacity: {value: 0.7}\n        \t}\n      \t}\n      \tmarks: [\n        \t{\n          \ttype: text\n          \t// if true, it will prevent clicking on the button when over text.\n          \tinteractive: false\n          \tencode: {\n            \tenter: {\n              \t// center text in the paren group\n              \txc: {\n                \tfield: {group: "width"}\n                \tmult: 0.5\n              \t}\n              \tyc: {\n                \tfield: {group: "height"}\n                \tmult: 0.5\n                \toffset: 2\n              \t}\n              \talign: {value: "center"}\n              \tbaseline: {value: "middle"}\n              \tfontWeight: {value: "bold"}\n              \ttext: {value: "Show All"}\n            \t}\n          \t}\n        \t}\n      \t]\n    \t}\n  \t]\n\t}\n  ]\n  signals: [\n\t{\n  \t// used to highlight traffic to/from the same country\n  \tname: groupHover\n  \tvalue: {}\n  \ton: [\n    \t{\n      \tevents: @groupMark:mouseover\n      \tupdate: "{stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}"\n    \t}\n    \t{events: "mouseout", update: "{}"}\n  \t]\n\t}\n\t// used to filter only the data related to the selected country\n\t{\n  \tname: groupSelector\n  \tvalue: false\n  \ton: [\n    \t{\n      \t// Clicking groupMark sets this signal to the filter values\n      \tevents: @groupMark:click!\n      \tupdate: "{stack:datum.stack, stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}"\n    \t}\n    \t{\n      \t// Clicking "show all" button, or double-clicking anywhere resets it\n      \tevents: [\n        \t{type: "click", markname: "groupReset"}\n        \t{type: "dblclick"}\n      \t]\n      \tupdate: "false"\n    \t}\n  \t]\n\t}\n  ]\n}\n',
      type: 'vega',
    },
    'd779c34c-3ba8-43a3-8c23-0acd72d2c097': {
      id: 'd779c34c-3ba8-43a3-8c23-0acd72d2c097',
      input: {
        defaultValue: null,
        kind: 'dropdown',
        optionsQuery: 'FROM kibana_sample_data_logs\n| STATS BY machine.os.keyword',
      },
      label: 'OS',
      name: 'choice_2',
      outputNames: {
        value: 'os',
      },
      type: 'input',
    },
    'dab50080-15d8-40d1-b7ca-46cdd97aed22': {
      content: 'Pretend this is a map 😀\n\n🌎',
      id: 'dab50080-15d8-40d1-b7ca-46cdd97aed22',
      label: '[Logs] Total Requests and Bytes',
      name: 'notes_2',
      type: 'markdown',
    },
    'db84c821-80ef-45cb-a0e0-3d6e95753b1c': {
      id: 'db84c821-80ef-45cb-a0e0-3d6e95753b1c',
      label: 'Chart 2',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                'c2ef7931-6bd6-421c-aa04-7248cdd73cc4': {
                  columns: [
                    {
                      columnId: 'Unique Visitors',
                      customLabel: false,
                      fieldName: 'Unique Visitors',
                      inMetricDimension: true,
                      label: 'Unique Visitors',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Unique Visitors',
                        },
                        type: 'number',
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| STATS\n    `Unique Visitors` = COUNT_DISTINCT(clientip),\n    Visits = COUNT(*)',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-c2ef7931-6bd6-421c-aa04-7248cdd73cc4',
              type: 'index-pattern',
            },
          ],
          visualization: {
            applyColorTo: 'background',
            density: 'default',
            layerId: 'c2ef7931-6bd6-421c-aa04-7248cdd73cc4',
            layerType: 'data',
            metricAccessor: 'Unique Visitors',
            palette: {
              name: 'custom',
              params: {
                colorStops: [
                  {
                    color: '#f6726a',
                    stop: 0,
                  },
                  {
                    color: '#fcd883',
                    stop: 500,
                  },
                  {
                    color: '#24c292',
                    stop: 1000,
                  },
                ],
                continuity: 'above',
                name: 'custom',
                progression: 'fixed',
                rangeMax: null,
                rangeMin: 0,
                rangeType: 'number',
                reverse: false,
                steps: 3,
                stops: [
                  {
                    color: '#f6726a',
                    stop: 500,
                  },
                  {
                    color: '#fcd883',
                    stop: 1000,
                  },
                  {
                    color: '#24c292',
                    stop: null,
                  },
                ],
              },
              type: 'palette',
            },
          },
        },
        title: 'Unique Visitors & Visits of (empty)',
        version: 3,
        visualizationType: 'lnsMetric',
      },
      name: 'chart_2',
      runMode: 'auto',
      sourceCell: '248b0bda-b6fc-454a-9ec9-41a88cf7ba3f',
      type: 'chart',
    },
    'edaa06f0-23da-4a8a-bb34-630c599edf8a': {
      id: 'edaa06f0-23da-4a8a-bb34-630c599edf8a',
      label: 'ES|QL 5',
      name: 'esql_5',
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| SORT @timestamp\n| EVAL t = now()\n| EVAL buckets = CASE(timestamp <= t AND timestamp >= t - 1 hour, "Last hour", "Other")\n| STATS sum = SUM(bytes), count = COUNT_DISTINCT(clientip) by buckets, extension.keyword\n| EVAL sum_last_hour = CASE(buckets == "Last hour", sum), sum_rest = CASE(buckets == "Other", sum), count_last_hour = CASE(buckets == "Last hour", count), count_rest = CASE(buckets == "Other", count)\n| STATS sum_last_hour = MAX(sum_last_hour), sum_rest = MAX(sum_rest), count_last_hour = MAX(count_last_hour), count_rest = MAX(count_rest) by buckets, extension.keyword\n| EVAL total_bytes = TO_DOUBLE(COALESCE(sum_last_hour, 0::LONG) + COALESCE(sum_rest, 0::LONG))\n| EVAL total_visits = TO_DOUBLE(COALESCE(count_last_hour, 0::LONG) + COALESCE(count_rest, 0::LONG))\n| KEEP count_last_hour, total_visits, total_bytes, sum_last_hour, extension.keyword\n| STATS count_last_hour = SUM(count_last_hour), total_visits  = SUM(total_visits), bytes_transform = SUM(total_bytes), bytes_transform_last_hour = SUM(sum_last_hour) BY extension.keyword\n| RENAME total_visits as `Unique Visits (Total)`, count_last_hour as `Unique Visits (Last hour)`, bytes_transform as `Bytes(Total)`, bytes_transform_last_hour as `Bytes(Last hour)`, extension.keyword as `Type`\n| SORT `Unique Visits (Total)` DESC',
      runMode: 'auto',
      type: 'esql',
    },
    'ef9233d1-1792-49f4-ba87-397941e40a33': {
      id: 'ef9233d1-1792-49f4-ba87-397941e40a33',
      label: 'Unique Heatmap data',
      name: 'esql_3',
      outputNames: {
        table: 'unique_heatmap',
      },
      query:
        'FROM kibana_sample_data_logs\n| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\n| WHERE ?country IS NULL OR geo.src == ?country\n| WHERE ?os IS NULL OR machine.os == ?os\n| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min)\n    AND (?bytes_max IS NULL OR bytes <= ?bytes_max)\n| INLINE STATS country_docs = COUNT(*) BY geo.dest\n| INLINE STATS totals = VALUES(country_docs)\n| EVAL cutoff = COALESCE(MV_SLICE(MV_SORT(totals, "DESC"), 24, 24), 0::long)\n| WHERE country_docs >= cutoff\n| EVAL hour = DATE_EXTRACT("hour_of_day", @timestamp)\n| STATS unique = COUNT_DISTINCT(clientip), docs = COUNT(*) BY country = geo.dest, hour\n| SORT country, hour\n| LIMIT 250',
      runMode: 'auto',
      type: 'esql',
    },
    'f5cab0d3-a376-47c3-bfd9-9d713cb94c8a': {
      id: 'f5cab0d3-a376-47c3-bfd9-9d713cb94c8a',
      label: 'Table 1',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                'c487f1f8-6db4-4ae3-ae10-cb830fa43c1e': {
                  columns: [
                    {
                      columnId: 'Bytes(Total)',
                      customLabel: false,
                      fieldName: 'Bytes(Total)',
                      inMetricDimension: true,
                      label: 'Bytes(Total)',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Bytes(Total)',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'Bytes(Last hour)',
                      customLabel: false,
                      fieldName: 'Bytes(Last hour)',
                      inMetricDimension: true,
                      label: 'Bytes(Last hour)',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Bytes(Last hour)',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'Unique Visits (Total)',
                      customLabel: false,
                      fieldName: 'Unique Visits (Total)',
                      inMetricDimension: true,
                      label: 'Unique Visits (Total)',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Unique Visits (Total)',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'Unique Visits (Last hour)',
                      customLabel: false,
                      fieldName: 'Unique Visits (Last hour)',
                      inMetricDimension: true,
                      label: 'Unique Visits (Last hour)',
                      meta: {
                        esType: 'long',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'Unique Visits (Last hour)',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'Type',
                      customLabel: false,
                      fieldName: 'Type',
                      label: 'Type',
                      meta: {
                        esType: 'keyword',
                        params: {
                          id: 'string',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: true,
                          sourceField: 'extension.keyword',
                        },
                        type: 'string',
                      },
                    },
                  ],
                  index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| SORT @timestamp\n| EVAL t = now()\n| EVAL buckets = CASE(timestamp <= t AND timestamp >= t - 1 hour, "Last hour", "Other")\n| STATS sum = SUM(bytes), count = COUNT_DISTINCT(clientip) by buckets, extension.keyword\n| EVAL sum_last_hour = CASE(buckets == "Last hour", sum), sum_rest = CASE(buckets == "Other", sum), count_last_hour = CASE(buckets == "Last hour", count), count_rest = CASE(buckets == "Other", count)\n| STATS sum_last_hour = MAX(sum_last_hour), sum_rest = MAX(sum_rest), count_last_hour = MAX(count_last_hour), count_rest = MAX(count_rest) by buckets, extension.keyword\n| EVAL total_bytes = TO_DOUBLE(COALESCE(sum_last_hour, 0::LONG) + COALESCE(sum_rest, 0::LONG))\n| EVAL total_visits = TO_DOUBLE(COALESCE(count_last_hour, 0::LONG) + COALESCE(count_rest, 0::LONG))\n| KEEP count_last_hour, total_visits, total_bytes, sum_last_hour, extension.keyword\n| STATS count_last_hour = SUM(count_last_hour), total_visits  = SUM(total_visits), bytes_transform = SUM(total_bytes), bytes_transform_last_hour = SUM(sum_last_hour) BY extension.keyword\n| RENAME total_visits as `Unique Visits (Total)`, count_last_hour as `Unique Visits (Last hour)`, bytes_transform as `Bytes(Total)`, bytes_transform_last_hour as `Bytes(Last hour)`, extension.keyword as `Type`\n| SORT `Unique Visits (Total)` DESC',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
              name: 'textBasedLanguages-datasource-layer-c487f1f8-6db4-4ae3-ae10-cb830fa43c1e',
              type: 'index-pattern',
            },
          ],
          visualization: {
            columns: [
              {
                colorMode: 'text',
                columnId: 'Unique Visits (Last hour)',
                palette: {
                  name: 'status',
                  params: {
                    continuity: 'above',
                    name: 'status',
                    progression: 'fixed',
                    rangeMax: null,
                    rangeMin: 0,
                    rangeType: 'percent',
                    reverse: false,
                    steps: 5,
                    stops: [
                      {
                        color: '#24c292',
                        stop: 0,
                      },
                      {
                        color: '#aee8d2',
                        stop: 20,
                      },
                      {
                        color: '#fcd883',
                        stop: 40,
                      },
                      {
                        color: '#ffc9c2',
                        stop: 60,
                      },
                      {
                        color: '#f6726a',
                        stop: 80,
                      },
                    ],
                  },
                  type: 'palette',
                },
              },
              {
                colorMode: 'text',
                columnId: 'Unique Visits (Total)',
                palette: {
                  name: 'status',
                  params: {
                    continuity: 'above',
                    name: 'status',
                    progression: 'fixed',
                    rangeMax: null,
                    rangeMin: 0,
                    rangeType: 'percent',
                    reverse: false,
                    steps: 5,
                    stops: [
                      {
                        color: '#24c292',
                        stop: 0,
                      },
                      {
                        color: '#aee8d2',
                        stop: 20,
                      },
                      {
                        color: '#fcd883',
                        stop: 40,
                      },
                      {
                        color: '#ffc9c2',
                        stop: 60,
                      },
                      {
                        color: '#f6726a',
                        stop: 80,
                      },
                    ],
                  },
                  type: 'palette',
                },
              },
              {
                columnId: 'Bytes(Total)',
              },
              {
                columnId: 'Bytes(Last hour)',
              },
              {
                columnId: 'Type',
              },
            ],
            layerId: 'c487f1f8-6db4-4ae3-ae10-cb830fa43c1e',
            layerType: 'data',
            showRowNumbers: true,
          },
        },
        title:
          'Unique Visits (Last hour) & Unique Visits (Total) & Bytes(Total) & Bytes(Last hour) of Type',
        version: 3,
        visualizationType: 'lnsDatatable',
      },
      name: 'chart_5',
      runMode: 'auto',
      sourceCell: 'edaa06f0-23da-4a8a-bb34-630c599edf8a',
      type: 'chart',
    },
    'f834b00a-b035-47e9-883a-20e78a5e7052': {
      id: 'f834b00a-b035-47e9-883a-20e78a5e7052',
      label: '[Logs] Bytes distribution',
      lensAttributes: {
        references: [],
        state: {
          adHocDataViews: {
            '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712': {
              allowHidden: false,
              allowNoIndex: false,
              fieldAttrs: {},
              fieldFormats: {},
              id: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
              managed: false,
              name: 'kibana_sample_data_logs',
              runtimeFieldMap: {},
              sourceFilters: [],
              timeFieldName: '@timestamp',
              title: 'kibana_sample_data_logs',
              type: 'esql',
            },
          },
          datasourceStates: {
            textBased: {
              layers: {
                '916e33dc-a2b9-4e09-9058-f0e3fb9d366a': {
                  columns: [
                    {
                      columnId: 'percentage',
                      customLabel: false,
                      fieldName: 'percentage',
                      inMetricDimension: true,
                      label: 'percentage',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'percentage',
                        },
                        type: 'number',
                      },
                    },
                    {
                      columnId: 'c908cc19-c51b-42b6-9b9a-3a37bcfb355c',
                      fieldName: 'bytes',
                      meta: {
                        esType: 'double',
                        params: {
                          id: 'number',
                        },
                        sourceParams: {
                          indexPattern: 'kibana_sample_data_logs',
                          isSourceFieldFilterable: false,
                          sourceField: 'bytes',
                        },
                        type: 'number',
                      },
                    },
                  ],
                  index: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
                  query: {
                    esql: 'FROM kibana_sample_data_logs\n| INLINESTATS total_visits = COUNT()\n| STATS visits = COUNT() by bytes = bucket(bytes, 1000, 0, 100000), total_visits\n| EVAL percentage = (TO_DOUBLE(visits) / total_visits)\n| EVAL percentage = ROUND(percentage, 3)\n| DROP total_visits, visits',
                  },
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          internalReferences: [
            {
              id: '6dc4379c8238e9dfb0fdf54b11c46fe8fe69f2901b50ccbe306091706013e712',
              name: 'textBasedLanguages-datasource-layer-916e33dc-a2b9-4e09-9058-f0e3fb9d366a',
              type: 'index-pattern',
            },
          ],
          visualization: {
            axisTitlesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            fittingFunction: 'Linear',
            gridlinesVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            labelsOrientation: {
              x: 0,
              yLeft: 0,
              yRight: 0,
            },
            layers: [
              {
                accessors: ['percentage'],
                colorMapping: {
                  assignments: [],
                  colorMode: {
                    type: 'categorical',
                  },
                  paletteId: 'default',
                  specialAssignments: [
                    {
                      color: {
                        type: 'loop',
                      },
                      rules: [
                        {
                          type: 'other',
                        },
                      ],
                    },
                  ],
                },
                layerId: '916e33dc-a2b9-4e09-9058-f0e3fb9d366a',
                layerType: 'data',
                seriesType: 'bar_stacked',
                xAccessor: 'c908cc19-c51b-42b6-9b9a-3a37bcfb355c',
              },
            ],
            legend: {
              isVisible: true,
              layout: 'list',
              position: 'bottom',
            },
            preferredSeriesType: 'bar_stacked',
            tickLabelsVisibilitySettings: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            valueLabels: 'hide',
          },
        },
        title: 'bytes & percentage of (empty)',
        version: 3,
        visualizationType: 'lnsXY',
      },
      name: 'chart_6',
      runMode: 'auto',
      sourceCell: '2f727eb8-e64e-480f-a58f-1c36190bb540',
      type: 'chart',
    },
    'fe7d0693-34dd-432f-8c44-174eccb877b4': {
      id: 'fe7d0693-34dd-432f-8c44-174eccb877b4',
      input: {
        defaultValue: null,
        kind: 'dropdown',
        optionsQuery: 'FROM kibana_sample_data_logs\n| STATS BY geo.src',
      },
      label: 'Source Country',
      name: 'choice_1',
      outputNames: {
        value: 'country',
      },
      type: 'input',
    },
    'fff3461c-d98d-4396-89eb-257060bbf912': {
      id: 'fff3461c-d98d-4396-89eb-257060bbf912',
      input: {
        defaultValue: null,
        kind: 'range',
        max: 20000,
        min: 0,
      },
      label: 'Bytes',
      name: 'range_1',
      outputNames: {
        max: 'bytes_max',
        min: 'bytes_min',
      },
      type: 'input',
    },
  },
  panels: [
    {
      gridColumns: 48,
      id: 'cee1fbc8-2054-4b06-9dbb-560378a4dda4',
      panels: [
        {
          cellId: 'fe7d0693-34dd-432f-8c44-174eccb877b4',
          height: 2,
          id: 'dc9d939e-4165-43af-919b-54d24a1b2b52',
          width: 16,
          x: 0,
          y: 0,
        },
        {
          cellId: 'd779c34c-3ba8-43a3-8c23-0acd72d2c097',
          height: 2,
          id: 'f7350990-609d-4623-ac18-a12039ca8d2f',
          width: 15,
          x: 16,
          y: 0,
        },
        {
          cellId: 'fff3461c-d98d-4396-89eb-257060bbf912',
          height: 2,
          id: 'f1876031-82a3-4330-91ff-7669e78de118',
          width: 17,
          x: 31,
          y: 0,
        },
        {
          cellId: 'ab86df12-74e1-4efe-ab79-519c978b3072',
          height: 7,
          id: '37f74c37-a96a-4811-a889-559fdcb705fb',
          width: 24,
          x: 0,
          y: 2,
        },
        {
          cellId: 'adc98e38-fa75-44b9-bc3c-751930f78075',
          height: 7,
          id: 'a9822ca2-833c-47e5-8bc3-25cbdf4d1bd1',
          width: 12,
          x: 24,
          y: 2,
        },
        {
          cellId: 'db84c821-80ef-45cb-a0e0-3d6e95753b1c',
          height: 7,
          id: '88bacfe2-8683-4133-9a50-d59518a1c608',
          width: 12,
          x: 36,
          y: 2,
        },
        {
          cellId: '6ffeb6fb-9bd8-4572-89e7-412e4e6eff95',
          height: 7,
          id: '5dbeafa6-226a-46ce-afb5-989a52db957f',
          width: 12,
          x: 24,
          y: 9,
        },
        {
          cellId: 'a0047b6c-b854-4aa2-a782-bbfd58986635',
          height: 7,
          id: 'f0face7a-8d25-4911-83b6-cb37bca20741',
          width: 12,
          x: 36,
          y: 9,
        },
        {
          cellId: '8c9395bf-c1d8-4e6b-93f4-ef56bf6fe6b8',
          height: 7,
          id: '485af82d-8d35-4d3e-a38f-d11a9b3edc85',
          showTitle: true,
          width: 24,
          x: 0,
          y: 9,
        },
        {
          cellId: 'dab50080-15d8-40d1-b7ca-46cdd97aed22',
          height: 18,
          id: 'e4c477f7-cb25-4275-99b9-0357cdd41d37',
          showTitle: true,
          width: 24,
          x: 0,
          y: 16,
        },
        {
          cellId: '9ab372f6-4a5f-4731-9b2b-00d2bafa6e71',
          height: 15,
          id: '17dd1686-6581-4158-8d3d-836b1c929717',
          showTitle: true,
          width: 24,
          x: 0,
          y: 34,
        },
        {
          cellId: 'cb7eb361-dfe8-4c7b-b970-9d0b99a2eae6',
          height: 33,
          id: '407bf145-6f6e-4789-b0dc-70d711511509',
          showTitle: true,
          width: 24,
          x: 24,
          y: 16,
        },
        {
          cellId: 'f5cab0d3-a376-47c3-bfd9-9d713cb94c8a',
          height: 13,
          id: '0905abce-8d92-4300-86e7-8d6823090ee5',
          width: 24,
          x: 0,
          y: 49,
        },
        {
          cellId: 'f834b00a-b035-47e9-883a-20e78a5e7052',
          height: 13,
          id: '64fa41fd-9505-43f4-8149-01063f2680c1',
          showTitle: true,
          width: 24,
          x: 24,
          y: 49,
        },
        {
          cellId: 'aaba6e68-01cb-495e-976e-c5e7cc69df96',
          height: 19,
          id: '749beeac-c2a6-4ab3-b84a-785724a14426',
          showTitle: true,
          width: 48,
          x: 0,
          y: 62,
        },
      ],
      title: 'Main App',
    },
  ],
};
