/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's logs sample-data and default Vega specs, taken as Kibana ships them, with each
// Elasticsearch query replaced by an inline response in the shape Elasticsearch returns.

import type { CorpusSpec } from './types';

export const kibanaSpecs: CorpusSpec[] = [
  {
    name: 'Kibana logs: unique destination heatmap',
    mode: 'vega-lite',
    spec: {
      data: {
        values: {
          aggregations: {
            countries: {
              buckets: [
                {
                  key: 'CN',
                  doc_count: 500,
                  hours: {
                    buckets: [
                      {
                        key: 0,
                        doc_count: 20,
                        unique: {
                          value: 0,
                        },
                      },
                      {
                        key: 1,
                        doc_count: 27,
                        unique: {
                          value: 5,
                        },
                      },
                      {
                        key: 2,
                        doc_count: 34,
                        unique: {
                          value: 10,
                        },
                      },
                      {
                        key: 3,
                        doc_count: 41,
                        unique: {
                          value: 15,
                        },
                      },
                      {
                        key: 4,
                        doc_count: 48,
                        unique: {
                          value: 20,
                        },
                      },
                      {
                        key: 5,
                        doc_count: 55,
                        unique: {
                          value: 2,
                        },
                      },
                      {
                        key: 6,
                        doc_count: 22,
                        unique: {
                          value: 7,
                        },
                      },
                      {
                        key: 7,
                        doc_count: 29,
                        unique: {
                          value: 12,
                        },
                      },
                      {
                        key: 8,
                        doc_count: 36,
                        unique: {
                          value: 17,
                        },
                      },
                      {
                        key: 9,
                        doc_count: 43,
                        unique: {
                          value: 22,
                        },
                      },
                      {
                        key: 10,
                        doc_count: 50,
                        unique: {
                          value: 4,
                        },
                      },
                      {
                        key: 11,
                        doc_count: 57,
                        unique: {
                          value: 9,
                        },
                      },
                      {
                        key: 12,
                        doc_count: 24,
                        unique: {
                          value: 14,
                        },
                      },
                      {
                        key: 13,
                        doc_count: 31,
                        unique: {
                          value: 19,
                        },
                      },
                      {
                        key: 14,
                        doc_count: 38,
                        unique: {
                          value: 1,
                        },
                      },
                      {
                        key: 15,
                        doc_count: 45,
                        unique: {
                          value: 6,
                        },
                      },
                      {
                        key: 16,
                        doc_count: 52,
                        unique: {
                          value: 11,
                        },
                      },
                      {
                        key: 17,
                        doc_count: 59,
                        unique: {
                          value: 16,
                        },
                      },
                      {
                        key: 18,
                        doc_count: 26,
                        unique: {
                          value: 21,
                        },
                      },
                      {
                        key: 19,
                        doc_count: 33,
                        unique: {
                          value: 3,
                        },
                      },
                      {
                        key: 20,
                        doc_count: 40,
                        unique: {
                          value: 8,
                        },
                      },
                      {
                        key: 21,
                        doc_count: 47,
                        unique: {
                          value: 13,
                        },
                      },
                      {
                        key: 22,
                        doc_count: 54,
                        unique: {
                          value: 18,
                        },
                      },
                      {
                        key: 23,
                        doc_count: 21,
                        unique: {
                          value: 0,
                        },
                      },
                    ],
                  },
                },
                {
                  key: 'IN',
                  doc_count: 440,
                  hours: {
                    buckets: [
                      {
                        key: 0,
                        doc_count: 31,
                        unique: {
                          value: 13,
                        },
                      },
                      {
                        key: 1,
                        doc_count: 38,
                        unique: {
                          value: 18,
                        },
                      },
                      {
                        key: 2,
                        doc_count: 45,
                        unique: {
                          value: 0,
                        },
                      },
                      {
                        key: 3,
                        doc_count: 52,
                        unique: {
                          value: 5,
                        },
                      },
                      {
                        key: 4,
                        doc_count: 59,
                        unique: {
                          value: 10,
                        },
                      },
                      {
                        key: 5,
                        doc_count: 26,
                        unique: {
                          value: 15,
                        },
                      },
                      {
                        key: 6,
                        doc_count: 33,
                        unique: {
                          value: 20,
                        },
                      },
                      {
                        key: 7,
                        doc_count: 40,
                        unique: {
                          value: 2,
                        },
                      },
                      {
                        key: 8,
                        doc_count: 47,
                        unique: {
                          value: 7,
                        },
                      },
                      {
                        key: 9,
                        doc_count: 54,
                        unique: {
                          value: 12,
                        },
                      },
                      {
                        key: 10,
                        doc_count: 21,
                        unique: {
                          value: 17,
                        },
                      },
                      {
                        key: 11,
                        doc_count: 28,
                        unique: {
                          value: 22,
                        },
                      },
                      {
                        key: 12,
                        doc_count: 35,
                        unique: {
                          value: 4,
                        },
                      },
                      {
                        key: 13,
                        doc_count: 42,
                        unique: {
                          value: 9,
                        },
                      },
                      {
                        key: 14,
                        doc_count: 49,
                        unique: {
                          value: 14,
                        },
                      },
                      {
                        key: 15,
                        doc_count: 56,
                        unique: {
                          value: 19,
                        },
                      },
                      {
                        key: 16,
                        doc_count: 23,
                        unique: {
                          value: 1,
                        },
                      },
                      {
                        key: 17,
                        doc_count: 30,
                        unique: {
                          value: 6,
                        },
                      },
                      {
                        key: 18,
                        doc_count: 37,
                        unique: {
                          value: 11,
                        },
                      },
                      {
                        key: 19,
                        doc_count: 44,
                        unique: {
                          value: 16,
                        },
                      },
                      {
                        key: 20,
                        doc_count: 51,
                        unique: {
                          value: 21,
                        },
                      },
                      {
                        key: 21,
                        doc_count: 58,
                        unique: {
                          value: 3,
                        },
                      },
                      {
                        key: 22,
                        doc_count: 25,
                        unique: {
                          value: 8,
                        },
                      },
                      {
                        key: 23,
                        doc_count: 32,
                        unique: {
                          value: 13,
                        },
                      },
                    ],
                  },
                },
                {
                  key: 'US',
                  doc_count: 380,
                  hours: {
                    buckets: [
                      {
                        key: 0,
                        doc_count: 42,
                        unique: {
                          value: 3,
                        },
                      },
                      {
                        key: 1,
                        doc_count: 49,
                        unique: {
                          value: 8,
                        },
                      },
                      {
                        key: 2,
                        doc_count: 56,
                        unique: {
                          value: 13,
                        },
                      },
                      {
                        key: 3,
                        doc_count: 23,
                        unique: {
                          value: 18,
                        },
                      },
                      {
                        key: 4,
                        doc_count: 30,
                        unique: {
                          value: 0,
                        },
                      },
                      {
                        key: 5,
                        doc_count: 37,
                        unique: {
                          value: 5,
                        },
                      },
                      {
                        key: 6,
                        doc_count: 44,
                        unique: {
                          value: 10,
                        },
                      },
                      {
                        key: 7,
                        doc_count: 51,
                        unique: {
                          value: 15,
                        },
                      },
                      {
                        key: 8,
                        doc_count: 58,
                        unique: {
                          value: 20,
                        },
                      },
                      {
                        key: 9,
                        doc_count: 25,
                        unique: {
                          value: 2,
                        },
                      },
                      {
                        key: 10,
                        doc_count: 32,
                        unique: {
                          value: 7,
                        },
                      },
                      {
                        key: 11,
                        doc_count: 39,
                        unique: {
                          value: 12,
                        },
                      },
                      {
                        key: 12,
                        doc_count: 46,
                        unique: {
                          value: 17,
                        },
                      },
                      {
                        key: 13,
                        doc_count: 53,
                        unique: {
                          value: 22,
                        },
                      },
                      {
                        key: 14,
                        doc_count: 20,
                        unique: {
                          value: 4,
                        },
                      },
                      {
                        key: 15,
                        doc_count: 27,
                        unique: {
                          value: 9,
                        },
                      },
                      {
                        key: 16,
                        doc_count: 34,
                        unique: {
                          value: 14,
                        },
                      },
                      {
                        key: 17,
                        doc_count: 41,
                        unique: {
                          value: 19,
                        },
                      },
                      {
                        key: 18,
                        doc_count: 48,
                        unique: {
                          value: 1,
                        },
                      },
                      {
                        key: 19,
                        doc_count: 55,
                        unique: {
                          value: 6,
                        },
                      },
                      {
                        key: 20,
                        doc_count: 22,
                        unique: {
                          value: 11,
                        },
                      },
                      {
                        key: 21,
                        doc_count: 29,
                        unique: {
                          value: 16,
                        },
                      },
                      {
                        key: 22,
                        doc_count: 36,
                        unique: {
                          value: 21,
                        },
                      },
                      {
                        key: 23,
                        doc_count: 43,
                        unique: {
                          value: 3,
                        },
                      },
                    ],
                  },
                },
                {
                  key: 'ID',
                  doc_count: 320,
                  hours: {
                    buckets: [
                      {
                        key: 0,
                        doc_count: 53,
                        unique: {
                          value: 16,
                        },
                      },
                      {
                        key: 1,
                        doc_count: 20,
                        unique: {
                          value: 21,
                        },
                      },
                      {
                        key: 2,
                        doc_count: 27,
                        unique: {
                          value: 3,
                        },
                      },
                      {
                        key: 3,
                        doc_count: 34,
                        unique: {
                          value: 8,
                        },
                      },
                      {
                        key: 4,
                        doc_count: 41,
                        unique: {
                          value: 13,
                        },
                      },
                      {
                        key: 5,
                        doc_count: 48,
                        unique: {
                          value: 18,
                        },
                      },
                      {
                        key: 6,
                        doc_count: 55,
                        unique: {
                          value: 0,
                        },
                      },
                      {
                        key: 7,
                        doc_count: 22,
                        unique: {
                          value: 5,
                        },
                      },
                      {
                        key: 8,
                        doc_count: 29,
                        unique: {
                          value: 10,
                        },
                      },
                      {
                        key: 9,
                        doc_count: 36,
                        unique: {
                          value: 15,
                        },
                      },
                      {
                        key: 10,
                        doc_count: 43,
                        unique: {
                          value: 20,
                        },
                      },
                      {
                        key: 11,
                        doc_count: 50,
                        unique: {
                          value: 2,
                        },
                      },
                      {
                        key: 12,
                        doc_count: 57,
                        unique: {
                          value: 7,
                        },
                      },
                      {
                        key: 13,
                        doc_count: 24,
                        unique: {
                          value: 12,
                        },
                      },
                      {
                        key: 14,
                        doc_count: 31,
                        unique: {
                          value: 17,
                        },
                      },
                      {
                        key: 15,
                        doc_count: 38,
                        unique: {
                          value: 22,
                        },
                      },
                      {
                        key: 16,
                        doc_count: 45,
                        unique: {
                          value: 4,
                        },
                      },
                      {
                        key: 17,
                        doc_count: 52,
                        unique: {
                          value: 9,
                        },
                      },
                      {
                        key: 18,
                        doc_count: 59,
                        unique: {
                          value: 14,
                        },
                      },
                      {
                        key: 19,
                        doc_count: 26,
                        unique: {
                          value: 19,
                        },
                      },
                      {
                        key: 20,
                        doc_count: 33,
                        unique: {
                          value: 1,
                        },
                      },
                      {
                        key: 21,
                        doc_count: 40,
                        unique: {
                          value: 6,
                        },
                      },
                      {
                        key: 22,
                        doc_count: 47,
                        unique: {
                          value: 11,
                        },
                      },
                      {
                        key: 23,
                        doc_count: 54,
                        unique: {
                          value: 16,
                        },
                      },
                    ],
                  },
                },
                {
                  key: 'BR',
                  doc_count: 260,
                  hours: {
                    buckets: [
                      {
                        key: 0,
                        doc_count: 24,
                        unique: {
                          value: 6,
                        },
                      },
                      {
                        key: 1,
                        doc_count: 31,
                        unique: {
                          value: 11,
                        },
                      },
                      {
                        key: 2,
                        doc_count: 38,
                        unique: {
                          value: 16,
                        },
                      },
                      {
                        key: 3,
                        doc_count: 45,
                        unique: {
                          value: 21,
                        },
                      },
                      {
                        key: 4,
                        doc_count: 52,
                        unique: {
                          value: 3,
                        },
                      },
                      {
                        key: 5,
                        doc_count: 59,
                        unique: {
                          value: 8,
                        },
                      },
                      {
                        key: 6,
                        doc_count: 26,
                        unique: {
                          value: 13,
                        },
                      },
                      {
                        key: 7,
                        doc_count: 33,
                        unique: {
                          value: 18,
                        },
                      },
                      {
                        key: 8,
                        doc_count: 40,
                        unique: {
                          value: 0,
                        },
                      },
                      {
                        key: 9,
                        doc_count: 47,
                        unique: {
                          value: 5,
                        },
                      },
                      {
                        key: 10,
                        doc_count: 54,
                        unique: {
                          value: 10,
                        },
                      },
                      {
                        key: 11,
                        doc_count: 21,
                        unique: {
                          value: 15,
                        },
                      },
                      {
                        key: 12,
                        doc_count: 28,
                        unique: {
                          value: 20,
                        },
                      },
                      {
                        key: 13,
                        doc_count: 35,
                        unique: {
                          value: 2,
                        },
                      },
                      {
                        key: 14,
                        doc_count: 42,
                        unique: {
                          value: 7,
                        },
                      },
                      {
                        key: 15,
                        doc_count: 49,
                        unique: {
                          value: 12,
                        },
                      },
                      {
                        key: 16,
                        doc_count: 56,
                        unique: {
                          value: 17,
                        },
                      },
                      {
                        key: 17,
                        doc_count: 23,
                        unique: {
                          value: 22,
                        },
                      },
                      {
                        key: 18,
                        doc_count: 30,
                        unique: {
                          value: 4,
                        },
                      },
                      {
                        key: 19,
                        doc_count: 37,
                        unique: {
                          value: 9,
                        },
                      },
                      {
                        key: 20,
                        doc_count: 44,
                        unique: {
                          value: 14,
                        },
                      },
                      {
                        key: 21,
                        doc_count: 51,
                        unique: {
                          value: 19,
                        },
                      },
                      {
                        key: 22,
                        doc_count: 58,
                        unique: {
                          value: 1,
                        },
                      },
                      {
                        key: 23,
                        doc_count: 25,
                        unique: {
                          value: 6,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
        format: {
          property: 'aggregations.countries.buckets',
        },
      },
      transform: [
        {
          flatten: ['hours.buckets'],
          as: ['buckets'],
        },
        {
          filter: 'datum.buckets.unique.value > 0',
        },
      ],
      mark: {
        type: 'rect',
        tooltip: {
          expr: '{"Unique Visitors": datum.buckets.unique.value,"geo.src": datum.key,"Hour": datum.buckets.key}',
        },
      },
      encoding: {
        x: {
          field: 'buckets.key',
          type: 'nominal',
          scale: {
            domain: {
              expr: 'sequence(0, 24)',
            },
          },
          axis: {
            title: false,
            labelAngle: 0,
          },
        },
        y: {
          field: 'key',
          type: 'nominal',
          sort: {
            field: '-buckets.unique.value',
          },
          axis: {
            title: false,
          },
        },
        color: {
          field: 'buckets.unique.value',
          type: 'quantitative',
          axis: {
            title: false,
          },
          scale: {
            scheme: 'blues',
          },
        },
      },
    },
  },
  {
    name: 'Kibana logs: machine OS and destination Sankey',
    mode: 'vega',
    spec: {
      data: [
        {
          name: 'rawData',
          values: {
            aggregations: {
              table: {
                buckets: [
                  {
                    key: {
                      stk1: 'win 8',
                      stk2: 'CN',
                    },
                    doc_count: 40,
                  },
                  {
                    key: {
                      stk1: 'win 8',
                      stk2: 'IN',
                    },
                    doc_count: 69,
                  },
                  {
                    key: {
                      stk1: 'win 8',
                      stk2: 'US',
                    },
                    doc_count: 98,
                  },
                  {
                    key: {
                      stk1: 'win 8',
                      stk2: 'BR',
                    },
                    doc_count: 127,
                  },
                  {
                    key: {
                      stk1: 'ios',
                      stk2: 'CN',
                    },
                    doc_count: 57,
                  },
                  {
                    key: {
                      stk1: 'ios',
                      stk2: 'IN',
                    },
                    doc_count: 86,
                  },
                  {
                    key: {
                      stk1: 'ios',
                      stk2: 'US',
                    },
                    doc_count: 115,
                  },
                  {
                    key: {
                      stk1: 'ios',
                      stk2: 'BR',
                    },
                    doc_count: 54,
                  },
                  {
                    key: {
                      stk1: 'osx',
                      stk2: 'CN',
                    },
                    doc_count: 74,
                  },
                  {
                    key: {
                      stk1: 'osx',
                      stk2: 'IN',
                    },
                    doc_count: 103,
                  },
                  {
                    key: {
                      stk1: 'osx',
                      stk2: 'US',
                    },
                    doc_count: 42,
                  },
                  {
                    key: {
                      stk1: 'osx',
                      stk2: 'BR',
                    },
                    doc_count: 71,
                  },
                  {
                    key: {
                      stk1: 'win xp',
                      stk2: 'CN',
                    },
                    doc_count: 91,
                  },
                  {
                    key: {
                      stk1: 'win xp',
                      stk2: 'IN',
                    },
                    doc_count: 120,
                  },
                  {
                    key: {
                      stk1: 'win xp',
                      stk2: 'US',
                    },
                    doc_count: 59,
                  },
                  {
                    key: {
                      stk1: 'win xp',
                      stk2: 'BR',
                    },
                    doc_count: 88,
                  },
                ],
              },
            },
          },
          format: {
            property: 'aggregations.table.buckets',
          },
          transform: [
            {
              type: 'formula',
              expr: 'datum.key.stk1',
              as: 'stk1',
            },
            {
              type: 'formula',
              expr: 'datum.key.stk2',
              as: 'stk2',
            },
            {
              type: 'formula',
              expr: 'datum.doc_count',
              as: 'size',
            },
          ],
        },
        {
          name: 'nodes',
          source: 'rawData',
          transform: [
            {
              type: 'filter',
              expr: '!groupSelector || groupSelector.stk1 == datum.stk1 || groupSelector.stk2 == datum.stk2',
            },
            {
              type: 'formula',
              expr: 'datum.stk1+datum.stk2',
              as: 'key',
            },
            {
              type: 'fold',
              fields: ['stk1', 'stk2'],
              as: ['stack', 'grpId'],
            },
            {
              type: 'formula',
              expr: "datum.stack == 'stk1' ? datum.stk1+datum.stk2 : datum.stk2+datum.stk1",
              as: 'sortField',
            },
            {
              type: 'stack',
              groupby: ['stack'],
              sort: {
                field: 'sortField',
                order: 'descending',
              },
              field: 'size',
            },
            {
              type: 'formula',
              expr: '(datum.y0+datum.y1)/2',
              as: 'yc',
            },
          ],
        },
        {
          name: 'groups',
          source: 'nodes',
          transform: [
            {
              type: 'aggregate',
              groupby: ['stack', 'grpId'],
              fields: ['size'],
              ops: ['sum'],
              as: ['total'],
            },
            {
              type: 'stack',
              groupby: ['stack'],
              sort: {
                field: 'grpId',
                order: 'descending',
              },
              field: 'total',
            },
            {
              type: 'formula',
              expr: "scale('y', datum.y0)",
              as: 'scaledY0',
            },
            {
              type: 'formula',
              expr: "scale('y', datum.y1)",
              as: 'scaledY1',
            },
            {
              type: 'formula',
              expr: "datum.stack == 'stk1'",
              as: 'rightLabel',
            },
            {
              type: 'formula',
              expr: "datum.total/domain('y')[1]",
              as: 'percentage',
            },
          ],
        },
        {
          name: 'destinationNodes',
          source: 'nodes',
          transform: [
            {
              type: 'filter',
              expr: "datum.stack == 'stk2'",
            },
          ],
        },
        {
          name: 'edges',
          source: 'nodes',
          transform: [
            {
              type: 'filter',
              expr: "datum.stack == 'stk1'",
            },
            {
              type: 'lookup',
              from: 'destinationNodes',
              key: 'key',
              fields: ['key'],
              as: ['target'],
            },
            {
              type: 'linkpath',
              orient: 'horizontal',
              shape: 'diagonal',
              sourceY: {
                expr: "scale('y', datum.yc)",
              },
              sourceX: {
                expr: "scale('x', 'stk1') + bandwidth('x')",
              },
              targetY: {
                expr: "scale('y', datum.target.yc)",
              },
              targetX: {
                expr: "scale('x', 'stk2')",
              },
            },
            {
              type: 'formula',
              expr: "range('y')[0]-scale('y', datum.size)",
              as: 'strokeWidth',
            },
            {
              type: 'formula',
              expr: "datum.size/domain('y')[1]",
              as: 'percentage',
            },
          ],
        },
      ],
      scales: [
        {
          name: 'x',
          type: 'band',
          range: 'width',
          domain: ['stk1', 'stk2'],
          paddingOuter: 0.05,
          paddingInner: 0.95,
        },
        {
          name: 'y',
          type: 'linear',
          range: 'height',
          domain: {
            data: 'nodes',
            field: 'y1',
          },
        },
        {
          name: 'color',
          type: 'ordinal',
          range: 'category',
          domain: {
            data: 'rawData',
            field: 'stk1',
          },
        },
        {
          name: 'stackNames',
          type: 'ordinal',
          range: ['Source', 'Destination'],
          domain: ['stk1', 'stk2'],
        },
      ],
      axes: [
        {
          orient: 'bottom',
          scale: 'x',
          encode: {
            labels: {
              update: {
                text: {
                  scale: 'stackNames',
                  field: 'value',
                },
              },
            },
          },
        },
        {
          orient: 'left',
          scale: 'y',
        },
      ],
      marks: [
        {
          type: 'path',
          name: 'edgeMark',
          from: {
            data: 'edges',
          },
          clip: true,
          encode: {
            update: {
              stroke: [
                {
                  test: "groupSelector && groupSelector.stack=='stk1'",
                  scale: 'color',
                  field: 'stk2',
                },
                {
                  scale: 'color',
                  field: 'stk1',
                },
              ],
              strokeWidth: {
                field: 'strokeWidth',
              },
              path: {
                field: 'path',
              },
              strokeOpacity: {
                signal:
                  '!groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 0.9 : 0.3',
              },
              zindex: {
                signal:
                  '!groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 1 : 0',
              },
              tooltip: {
                signal:
                  "datum.stk1 + ' → ' + datum.stk2 + '\t' + format(datum.size, ',.0f') + '   (' + format(datum.percentage, '.1%') + ')'",
              },
            },
            hover: {
              strokeOpacity: {
                value: 1,
              },
            },
          },
        },
        {
          type: 'rect',
          name: 'groupMark',
          from: {
            data: 'groups',
          },
          encode: {
            enter: {
              fill: {
                scale: 'color',
                field: 'grpId',
              },
              width: {
                scale: 'x',
                band: 1,
              },
            },
            update: {
              x: {
                scale: 'x',
                field: 'stack',
              },
              y: {
                field: 'scaledY0',
              },
              y2: {
                field: 'scaledY1',
              },
              fillOpacity: {
                value: 0.6,
              },
              tooltip: {
                signal:
                  "datum.grpId + '   ' + format(datum.total, ',.0f') + '   (' + format(datum.percentage, '.1%') + ')'",
              },
            },
            hover: {
              fillOpacity: {
                value: 1,
              },
            },
          },
        },
        {
          type: 'text',
          from: {
            data: 'groups',
          },
          interactive: false,
          encode: {
            update: {
              x: {
                signal: "scale('x', datum.stack) + (datum.rightLabel ? bandwidth('x') + 8 : -8)",
              },
              yc: {
                signal: '(datum.scaledY0 + datum.scaledY1)/2',
              },
              align: {
                signal: "datum.rightLabel ? 'left' : 'right'",
              },
              baseline: {
                value: 'middle',
              },
              fontWeight: {
                value: 'bold',
              },
              text: {
                signal: "abs(datum.scaledY0-datum.scaledY1) > 13 ? datum.grpId : ''",
              },
            },
          },
        },
        {
          type: 'group',
          data: [
            {
              name: 'dataForShowAll',
              values: [{}],
              transform: [
                {
                  type: 'filter',
                  expr: 'groupSelector',
                },
              ],
            },
          ],
          encode: {
            enter: {
              xc: {
                signal: 'width/2',
              },
              y: {
                value: 30,
              },
              width: {
                value: 80,
              },
              height: {
                value: 30,
              },
            },
          },
          marks: [
            {
              type: 'group',
              name: 'groupReset',
              from: {
                data: 'dataForShowAll',
              },
              encode: {
                enter: {
                  cornerRadius: {
                    value: 6,
                  },
                  fill: {
                    value: '#F5F7FA',
                  },
                  stroke: {
                    value: '#c1c1c1',
                  },
                  strokeWidth: {
                    value: 2,
                  },
                  height: {
                    field: {
                      group: 'height',
                    },
                  },
                  width: {
                    field: {
                      group: 'width',
                    },
                  },
                },
                update: {
                  opacity: {
                    value: 1,
                  },
                },
                hover: {
                  opacity: {
                    value: 0.7,
                  },
                },
              },
              marks: [
                {
                  type: 'text',
                  interactive: false,
                  encode: {
                    enter: {
                      xc: {
                        field: {
                          group: 'width',
                        },
                        mult: 0.5,
                      },
                      yc: {
                        field: {
                          group: 'height',
                        },
                        mult: 0.5,
                        offset: 2,
                      },
                      align: {
                        value: 'center',
                      },
                      baseline: {
                        value: 'middle',
                      },
                      fontWeight: {
                        value: 'bold',
                      },
                      text: {
                        value: 'Show All',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      signals: [
        {
          name: 'groupHover',
          value: {},
          on: [
            {
              events: '@groupMark:mouseover',
              update:
                "{stk1:datum.stack=='stk1' && datum.grpId, stk2:datum.stack=='stk2' && datum.grpId}",
            },
            {
              events: 'mouseout',
              update: '{}',
            },
          ],
        },
        {
          name: 'groupSelector',
          value: false,
          on: [
            {
              events: '@groupMark:click!',
              update:
                "{stack:datum.stack, stk1:datum.stack=='stk1' && datum.grpId, stk2:datum.stack=='stk2' && datum.grpId}",
            },
            {
              events: [
                {
                  type: 'click',
                  markname: 'groupReset',
                },
                {
                  type: 'dblclick',
                },
              ],
              update: 'false',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Kibana default Vega spec',
    mode: 'vega-lite',
    spec: {
      title: 'Event counts from all indexes',
      data: {
        values: {
          aggregations: {
            time_buckets: {
              buckets: [
                {
                  key: 1772323200000,
                  key_as_string: '2026-03-01T00:00:00.000Z',
                  doc_count: 100,
                },
                {
                  key: 1772409600000,
                  key_as_string: '2026-03-02T00:00:00.000Z',
                  doc_count: 137,
                },
                {
                  key: 1772496000000,
                  key_as_string: '2026-03-03T00:00:00.000Z',
                  doc_count: 174,
                },
                {
                  key: 1772582400000,
                  key_as_string: '2026-03-04T00:00:00.000Z',
                  doc_count: 131,
                },
                {
                  key: 1772668800000,
                  key_as_string: '2026-03-05T00:00:00.000Z',
                  doc_count: 168,
                },
                {
                  key: 1772755200000,
                  key_as_string: '2026-03-06T00:00:00.000Z',
                  doc_count: 125,
                },
                {
                  key: 1772841600000,
                  key_as_string: '2026-03-07T00:00:00.000Z',
                  doc_count: 162,
                },
                {
                  key: 1772928000000,
                  key_as_string: '2026-03-08T00:00:00.000Z',
                  doc_count: 119,
                },
                {
                  key: 1773014400000,
                  key_as_string: '2026-03-09T00:00:00.000Z',
                  doc_count: 156,
                },
                {
                  key: 1773100800000,
                  key_as_string: '2026-03-10T00:00:00.000Z',
                  doc_count: 113,
                },
                {
                  key: 1773187200000,
                  key_as_string: '2026-03-11T00:00:00.000Z',
                  doc_count: 150,
                },
                {
                  key: 1773273600000,
                  key_as_string: '2026-03-12T00:00:00.000Z',
                  doc_count: 107,
                },
                {
                  key: 1773360000000,
                  key_as_string: '2026-03-13T00:00:00.000Z',
                  doc_count: 144,
                },
                {
                  key: 1773446400000,
                  key_as_string: '2026-03-14T00:00:00.000Z',
                  doc_count: 101,
                },
              ],
            },
          },
        },
        format: {
          property: 'aggregations.time_buckets.buckets',
        },
      },
      mark: 'line',
      encoding: {
        x: {
          field: 'key',
          type: 'temporal',
          axis: {
            title: false,
          },
        },
        y: {
          field: 'doc_count',
          type: 'quantitative',
          axis: {
            title: 'Document count',
          },
        },
      },
    },
  },
];
