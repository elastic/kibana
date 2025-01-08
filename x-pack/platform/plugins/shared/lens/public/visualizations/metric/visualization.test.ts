/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { CUSTOM_PALETTE, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { ExpressionAstExpression, ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import { euiLightVars, euiThemeVars } from '@kbn/ui-theme';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { createMockDatasource, createMockFramePublicAPI, generateActiveData } from '../../mocks';
import {
  DatasourceLayers,
  DatasourcePublicAPI,
  OperationDescriptor,
  OperationMetadata,
  Visualization,
} from '../../types';
import { GROUP_ID } from './constants';
import { getMetricVisualization } from './visualization';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { Ast } from '@kbn/interpreter';
import { LayoutDirection } from '@elastic/charts';
import { MetricVisualizationState } from './types';

const paletteService = chartPluginMock.createPaletteRegistry();
const theme = themeServiceMock.createStartContract();

describe('metric visualization', () => {
  const visualization = getMetricVisualization({
    paletteService,
    theme,
  });

  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: CUSTOM_PALETTE,
    params: {
      rangeType: 'percent',
      stops: [
        { color: 'blue', stop: 0 },
        { color: 'yellow', stop: 100 },
      ],
    },
  };

  const trendlineProps = {
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-col-id',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  } as const;

  const fullState: Required<
    Omit<
      MetricVisualizationState,
      | 'trendlineLayerId'
      | 'trendlineLayerType'
      | 'trendlineMetricAccessor'
      | 'trendlineSecondaryMetricAccessor'
      | 'trendlineTimeAccessor'
      | 'trendlineBreakdownByAccessor'
    >
  > = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: 'subtitle',
    icon: 'empty',
    secondaryPrefix: 'extra-text',
    progressDirection: 'vertical',
    maxCols: 5,
    color: 'static-color',
    palette,
    showBar: false,
    titlesTextAlign: 'left',
    valuesTextAlign: 'right',
    iconAlign: 'left',
    valueFontMode: 'default',
  };

  const fullStateWTrend: Required<MetricVisualizationState> = {
    ...fullState,
    ...trendlineProps,
  };

  const mockFrameApi = createMockFramePublicAPI({
    activeData: generateActiveData([
      {
        id: 'first',
        rows: Array(3).fill({ 'metric-col-id': 20, 'max-metric-col-id': 100 }),
      },
    ]),
  });

  describe('initialization', () => {
    test('returns a default state', () => {
      expect(visualization.initialize(() => 'some-id')).toEqual({
        layerId: 'some-id',
        layerType: LayerTypes.DATA,
      });
    });

    test('returns persisted state', () => {
      expect(visualization.initialize(() => fullState.layerId, fullState)).toEqual(fullState);
    });
  });

  describe('dimension groups configuration', () => {
    describe('primary layer', () => {
      test('generates configuration', () => {
        expect(
          visualization.getConfiguration({
            state: fullState,
            layerId: fullState.layerId,
            frame: mockFrameApi,
          })
        ).toMatchSnapshot();
      });

      test('color-by-value', () => {
        expect(
          visualization.getConfiguration({
            state: fullState,
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[0].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "columnId": "metric-col-id",
              "palette": Array [
                "blue",
                "yellow",
              ],
              "triggerIconType": "colorBy",
            },
          ]
        `);

        expect(
          visualization.getConfiguration({
            state: { ...fullState, palette: undefined, color: undefined },
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[0].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "color": "#ffffff",
              "columnId": "metric-col-id",
              "triggerIconType": "color",
            },
          ]
        `);
      });

      test('static coloring', () => {
        expect(
          visualization.getConfiguration({
            state: { ...fullState, palette: undefined },
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[0].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "color": "static-color",
              "columnId": "metric-col-id",
              "triggerIconType": "color",
            },
          ]
        `);

        expect(
          visualization.getConfiguration({
            state: { ...fullState, color: undefined },
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[0].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "columnId": "metric-col-id",
              "palette": Array [
                "blue",
                "yellow",
              ],
              "triggerIconType": "colorBy",
            },
          ]
        `);
      });

      test('collapse function', () => {
        expect(
          visualization.getConfiguration({
            state: fullState,
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[3].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "columnId": "breakdown-col-id",
              "triggerIconType": "aggregate",
            },
          ]
        `);

        expect(
          visualization.getConfiguration({
            state: { ...fullState, collapseFn: undefined },
            layerId: fullState.layerId,
            frame: mockFrameApi,
          }).groups[3].accessors
        ).toMatchInlineSnapshot(`
          Array [
            Object {
              "columnId": "breakdown-col-id",
              "triggerIconType": undefined,
            },
          ]
        `);
      });

      describe('operation filtering', () => {
        const unsupportedDataType = 'string';

        const operations: OperationMetadata[] = [
          {
            isBucketed: true,
            dataType: 'number',
          },
          {
            isBucketed: true,
            dataType: unsupportedDataType,
          },
          {
            isBucketed: false,
            dataType: 'number',
          },
          {
            isBucketed: false,
            dataType: unsupportedDataType,
          },
        ];

        const testConfig = visualization
          .getConfiguration({
            state: fullState,
            layerId: fullState.layerId,
            frame: mockFrameApi,
          })
          .groups.map(({ groupId, filterOperations }) => [groupId, filterOperations]);

        it.each(testConfig)('%s supports correct operations', (_, filterFn) => {
          expect(
            operations.filter(filterFn as (operation: OperationMetadata) => boolean)
          ).toMatchSnapshot();
        });
      });
    });

    describe('trendline layer', () => {
      test('generates configuration', () => {
        expect(
          visualization.getConfiguration({
            state: fullStateWTrend,
            layerId: fullStateWTrend.trendlineLayerId,
            frame: mockFrameApi,
          })
        ).toMatchSnapshot();
      });
    });
  });

  describe('generating an expression', () => {
    const maxPossibleNumValues = 7;
    let datasourceLayers: DatasourceLayers;
    beforeEach(() => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.getMaxPossibleNumValues.mockReturnValue(maxPossibleNumValues);
      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        isStaticValue: false,
        dataType: 'number',
      } as OperationDescriptor);

      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
        second: mockDatasource.publicAPIMock,
      };
    });

    it('is null when no metric accessor', () => {
      const state: MetricVisualizationState = {
        layerId: 'first',
        layerType: 'data',
        metricAccessor: undefined,
      };

      expect(visualization.toExpression(state, datasourceLayers)).toBeNull();
    });

    it('builds single metric', () => {
      expect(
        visualization.toExpression(
          {
            ...fullState,
            breakdownByAccessor: undefined,
            collapseFn: undefined,
          },
          datasourceLayers
        )
      ).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "color": Array [
                  "static-color",
                ],
                "iconAlign": Array [
                  "left",
                ],
                "inspectorTableId": Array [
                  "first",
                ],
                "max": Array [
                  "max-metric-col-id",
                ],
                "maxCols": Array [
                  5,
                ],
                "metric": Array [
                  "metric-col-id",
                ],
                "palette": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "name": Array [
                            "mocked",
                          ],
                        },
                        "function": "system_palette",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "secondaryMetric": Array [
                  "secondary-metric-col-id",
                ],
                "secondaryPrefix": Array [
                  "extra-text",
                ],
                "subtitle": Array [
                  "subtitle",
                ],
                "titlesTextAlign": Array [
                  "left",
                ],
                "trendline": Array [],
                "valueFontSize": Array [
                  "default",
                ],
                "valuesTextAlign": Array [
                  "right",
                ],
              },
              "function": "metricVis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    it('builds breakdown by metric', () => {
      expect(visualization.toExpression({ ...fullState, collapseFn: undefined }, datasourceLayers))
        .toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "breakdownBy": Array [
                  "breakdown-col-id",
                ],
                "color": Array [
                  "static-color",
                ],
                "iconAlign": Array [
                  "left",
                ],
                "inspectorTableId": Array [
                  "first",
                ],
                "max": Array [
                  "max-metric-col-id",
                ],
                "maxCols": Array [
                  5,
                ],
                "metric": Array [
                  "metric-col-id",
                ],
                "minTiles": Array [
                  7,
                ],
                "palette": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "name": Array [
                            "mocked",
                          ],
                        },
                        "function": "system_palette",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "secondaryMetric": Array [
                  "secondary-metric-col-id",
                ],
                "secondaryPrefix": Array [
                  "extra-text",
                ],
                "subtitle": Array [
                  "subtitle",
                ],
                "titlesTextAlign": Array [
                  "left",
                ],
                "trendline": Array [],
                "valueFontSize": Array [
                  "default",
                ],
                "valuesTextAlign": Array [
                  "right",
                ],
              },
              "function": "metricVis",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    describe('trendline expression', () => {
      const getTrendlineExpression = (state: MetricVisualizationState) => {
        const expression = visualization.toExpression(
          state,
          datasourceLayers,
          {},
          {
            [trendlineProps.trendlineLayerId]: { chain: [] } as unknown as Ast,
          }
        ) as ExpressionAstExpression;

        return expression.chain!.find((fn) => fn.function === 'metricVis')!.arguments.trendline[0];
      };

      it('adds trendline if prerequisites are present', () => {
        expect(getTrendlineExpression({ ...fullStateWTrend, collapseFn: undefined }))
          .toMatchInlineSnapshot(`
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "breakdownBy": Array [
                    "trendline-breakdown-col-id",
                  ],
                  "inspectorTableId": Array [
                    "second",
                  ],
                  "metric": Array [
                    "trendline-metric-col-id",
                  ],
                  "table": Array [
                    Object {
                      "chain": Array [],
                    },
                  ],
                  "timeField": Array [
                    "trendline-time-col-id",
                  ],
                },
                "function": "metricTrendline",
                "type": "function",
              },
            ],
            "type": "expression",
          }
        `);

        expect(
          getTrendlineExpression({ ...fullStateWTrend, trendlineBreakdownByAccessor: undefined })
        ).toMatchInlineSnapshot(`
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "inspectorTableId": Array [
                    "second",
                  ],
                  "metric": Array [
                    "trendline-metric-col-id",
                  ],
                  "table": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "by": Array [
                              "trendline-time-col-id",
                            ],
                            "fn": Array [
                              "sum",
                            ],
                            "metric": Array [
                              "trendline-metric-col-id",
                            ],
                          },
                          "function": "lens_collapse",
                          "type": "function",
                        },
                      ],
                    },
                  ],
                  "timeField": Array [
                    "trendline-time-col-id",
                  ],
                },
                "function": "metricTrendline",
                "type": "function",
              },
            ],
            "type": "expression",
          }
        `);
      });

      it('should apply collapse-by fn', () => {
        expect(getTrendlineExpression(fullStateWTrend)).toMatchInlineSnapshot(`
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "inspectorTableId": Array [
                    "second",
                  ],
                  "metric": Array [
                    "trendline-metric-col-id",
                  ],
                  "table": Array [
                    Object {
                      "chain": Array [
                        Object {
                          "arguments": Object {
                            "by": Array [
                              "trendline-time-col-id",
                            ],
                            "fn": Array [
                              "sum",
                            ],
                            "metric": Array [
                              "trendline-metric-col-id",
                            ],
                          },
                          "function": "lens_collapse",
                          "type": "function",
                        },
                      ],
                    },
                  ],
                  "timeField": Array [
                    "trendline-time-col-id",
                  ],
                },
                "function": "metricTrendline",
                "type": "function",
              },
            ],
            "type": "expression",
          }
        `);
      });

      it('no trendline if no trendline layer', () => {
        expect(
          getTrendlineExpression({ ...fullStateWTrend, trendlineLayerId: undefined })
        ).toBeUndefined();
      });

      it('no trendline if either metric or timefield are missing', () => {
        expect(
          getTrendlineExpression({ ...fullStateWTrend, trendlineMetricAccessor: undefined })
        ).toBeUndefined();

        expect(
          getTrendlineExpression({ ...fullStateWTrend, trendlineTimeAccessor: undefined })
        ).toBeUndefined();
      });
    });

    describe('with collapse function', () => {
      it('builds breakdown by metric with collapse function', () => {
        const ast = visualization.toExpression(
          {
            ...fullState,
            collapseFn: 'sum',
            // Turning off an accessor to make sure it gets filtered out from the collapse arguments
            secondaryMetricAccessor: undefined,
          },
          datasourceLayers
        ) as ExpressionAstExpression;

        expect(ast.chain).toHaveLength(2);
        expect(ast.chain[0]).toMatchInlineSnapshot(`
          Object {
            "arguments": Object {
              "by": Array [],
              "fn": Array [
                "sum",
                "sum",
              ],
              "metric": Array [
                "metric-col-id",
                "max-metric-col-id",
              ],
            },
            "function": "lens_collapse",
            "type": "function",
          }
        `);
        expect(ast.chain[1].arguments.minTiles).toBeUndefined();
        expect(ast.chain[1].arguments.breakdownBy).toBeUndefined();
      });

      it('always applies max function to static max dimensions', () => {
        (
          datasourceLayers.first as jest.Mocked<DatasourcePublicAPI>
        ).getOperationForColumnId.mockReturnValue({
          isStaticValue: true,
        } as OperationDescriptor);

        const ast = visualization.toExpression(
          {
            ...fullState,
            collapseFn: 'sum', // this should be overridden for the max dimension
          },
          datasourceLayers
        ) as ExpressionAstExpression;

        expect(ast.chain).toHaveLength(2);
        expect(ast.chain[0]).toMatchInlineSnapshot(`
          Object {
            "arguments": Object {
              "by": Array [],
              "fn": Array [
                "sum",
                "sum",
                "max",
              ],
              "metric": Array [
                "metric-col-id",
                "secondary-metric-col-id",
                "max-metric-col-id",
              ],
            },
            "function": "lens_collapse",
            "type": "function",
          }
        `);
        (
          datasourceLayers.first as jest.Mocked<DatasourcePublicAPI>
        ).getOperationForColumnId.mockClear();
      });
    });

    it('incorporates datasource expression if provided', () => {
      const datasourceFn: ExpressionAstFunction = {
        type: 'function',
        function: 'some-data-function',
        arguments: {},
      };

      const datasourceExpressionsByLayers: Record<string, ExpressionAstExpression> = {
        first: { type: 'expression', chain: [datasourceFn] },
      };

      const ast = visualization.toExpression(
        fullState,
        datasourceLayers,
        {},
        datasourceExpressionsByLayers
      ) as ExpressionAstExpression;

      expect(ast.chain).toHaveLength(3);
      expect(ast.chain[0]).toEqual(datasourceFn);
    });

    describe('static color', () => {
      it('uses color from state', () => {
        const color = 'color-fun';

        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                color,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(color);
      });

      it('can use a default color', () => {
        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                showBar: true,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(euiLightVars.euiColorPrimary);

        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                showBar: false,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(euiLightVars.euiColorEmptyShade);

        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                maxAccessor: undefined,
                showBar: false,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toBe(euiLightVars.euiColorEmptyShade);

        // this case isn't currently relevant because other parts of the code don't allow showBar to be
        // set when there isn't a max dimension but this test covers the branch anyhow
        expect(
          (
            visualization.toExpression(
              {
                ...fullState,
                maxAccessor: undefined,
                showBar: true,
                color: undefined,
              },
              datasourceLayers
            ) as ExpressionAstExpression
          ).chain[1].arguments.color[0]
        ).toEqual(euiThemeVars.euiColorEmptyShade);
      });
    });

    it('defaults progress direction to vertical', () => {
      const AST = visualization.toExpression(
        {
          ...fullState,
          progressDirection: undefined,
          showBar: true,
        },
        datasourceLayers
      ) as ExpressionAstExpression;
      expect(AST.chain[1].arguments.progressDirection[0]).toBe(LayoutDirection.Vertical);
    });
  });

  it('clears a layer', () => {
    expect(visualization.clearLayer(fullState, 'some-id', 'indexPattern1')).toMatchInlineSnapshot(`
      Object {
        "icon": "empty",
        "iconAlign": "left",
        "layerId": "first",
        "layerType": "data",
        "titlesTextAlign": "left",
        "valueFontMode": "default",
        "valuesTextAlign": "right",
      }
    `);
  });

  it('removes all accessors from a layer', () => {
    const chk = visualization.removeLayer!(fullState, 'first');
    expect(chk.metricAccessor).toBeUndefined();
    expect(chk.trendlineLayerId).toBeUndefined();
    expect(chk.trendlineLayerType).toBeUndefined();
    expect(chk.trendlineMetricAccessor).toBeUndefined();
    expect(chk.trendlineTimeAccessor).toBeUndefined();
    expect(chk.trendlineBreakdownByAccessor).toBeUndefined();
  });

  it('appends a trendline layer', () => {
    const newLayerId = 'new-layer-id';
    const chk = visualization.appendLayer!(fullState, newLayerId, 'metricTrendline', '');
    expect(chk.trendlineLayerId).toBe(newLayerId);
    expect(chk.trendlineLayerType).toBe('metricTrendline');
  });

  it('removes trendline layer', () => {
    const chk = visualization.removeLayer!(fullStateWTrend, fullStateWTrend.trendlineLayerId);
    expect(chk.metricAccessor).toBe('metric-col-id');
    expect(chk.trendlineLayerId).toBeUndefined();
    expect(chk.trendlineLayerType).toBeUndefined();
    expect(chk.trendlineMetricAccessor).toBeUndefined();
    expect(chk.trendlineTimeAccessor).toBeUndefined();
    expect(chk.trendlineBreakdownByAccessor).toBeUndefined();
  });

  test('getLayerIds', () => {
    expect(visualization.getLayerIds(fullState)).toEqual([fullState.layerId]);
    expect(visualization.getLayerIds(fullStateWTrend)).toEqual([
      fullStateWTrend.layerId,
      fullStateWTrend.trendlineLayerId,
    ]);
  });

  test('getLayersToLinkTo', () => {
    expect(
      visualization.getLayersToLinkTo!(fullStateWTrend, fullStateWTrend.trendlineLayerId)
    ).toEqual([fullStateWTrend.layerId]);
    expect(visualization.getLayersToLinkTo!(fullStateWTrend, 'foo-id')).toEqual([]);
  });

  describe('linked dimensions', () => {
    it('doesnt report links when no trendline layer', () => {
      expect(visualization.getLinkedDimensions!(fullState)).toHaveLength(0);
    });

    it('links metrics when present on leader layer', () => {
      const localState: MetricVisualizationState = {
        ...fullStateWTrend,
        breakdownByAccessor: undefined,
        secondaryMetricAccessor: undefined,
      };

      expect(visualization.getLinkedDimensions!(localState)).toMatchInlineSnapshot(`
        Array [
          Object {
            "from": Object {
              "columnId": "metric-col-id",
              "groupId": "metric",
              "layerId": "first",
            },
            "to": Object {
              "columnId": "trendline-metric-col-id",
              "groupId": "trendMetric",
              "layerId": "second",
            },
          },
        ]
      `);

      const newColumnId = visualization.getLinkedDimensions!({
        ...localState,
        trendlineMetricAccessor: undefined,
      })[0].to.columnId;
      expect(newColumnId).toBeUndefined();
    });

    it('links secondary metrics when present on leader layer', () => {
      const localState: MetricVisualizationState = {
        ...fullStateWTrend,
        metricAccessor: undefined,
        breakdownByAccessor: undefined,
      };

      expect(visualization.getLinkedDimensions!(localState)).toMatchInlineSnapshot(`
        Array [
          Object {
            "from": Object {
              "columnId": "secondary-metric-col-id",
              "groupId": "secondaryMetric",
              "layerId": "first",
            },
            "to": Object {
              "columnId": "trendline-secondary-metric-col-id",
              "groupId": "trendSecondaryMetric",
              "layerId": "second",
            },
          },
        ]
      `);

      const newColumnId = visualization.getLinkedDimensions!({
        ...localState,
        trendlineSecondaryMetricAccessor: undefined,
      })[0].to.columnId;
      expect(newColumnId).toBeUndefined();
    });

    it('links breakdowns when present', () => {
      const localState: MetricVisualizationState = {
        ...fullStateWTrend,
        metricAccessor: undefined,
        secondaryMetricAccessor: undefined,
      };

      expect(visualization.getLinkedDimensions!(localState)).toMatchInlineSnapshot(`
        Array [
          Object {
            "from": Object {
              "columnId": "breakdown-col-id",
              "groupId": "breakdownBy",
              "layerId": "first",
            },
            "to": Object {
              "columnId": "trendline-breakdown-col-id",
              "groupId": "trendBreakdownBy",
              "layerId": "second",
            },
          },
        ]
      `);

      const newColumnId = visualization.getLinkedDimensions!({
        ...localState,
        trendlineBreakdownByAccessor: undefined,
      })[0].to.columnId;
      expect(newColumnId).toBeUndefined();
    });
  });

  it('marks trendline layer for removal on index pattern switch', () => {
    expect(visualization.getLayersToRemoveOnIndexPatternChange!(fullStateWTrend)).toEqual([
      fullStateWTrend.trendlineLayerId,
    ]);
    expect(visualization.getLayersToRemoveOnIndexPatternChange!(fullState)).toEqual([]);
  });

  it('gives a description', () => {
    expect(visualization.getDescription(fullState)).toMatchInlineSnapshot(`
      Object {
        "icon": [Function],
        "label": "Metric",
      }
    `);
  });

  describe('getting supported layers', () => {
    it('works without state', () => {
      const supportedLayers = visualization.getSupportedLayers();
      expect(supportedLayers[0].initialDimensions).toBeUndefined();
      expect(supportedLayers[0]).toMatchInlineSnapshot(`
        Object {
          "disabled": true,
          "initialDimensions": undefined,
          "label": "Visualization",
          "type": "data",
        }
      `);

      expect({ ...supportedLayers[1], initialDimensions: undefined }).toMatchInlineSnapshot(`
        Object {
          "disabled": false,
          "initialDimensions": undefined,
          "label": "Trendline",
          "type": "metricTrendline",
        }
      `);

      expect(supportedLayers[1].initialDimensions).toHaveLength(1);
      expect(supportedLayers[1].initialDimensions![0]).toMatchObject({
        groupId: GROUP_ID.TREND_TIME,
        autoTimeField: true,
        columnId: expect.any(String),
      });
    });

    it('includes max static value dimension when state provided', () => {
      const supportedLayers = visualization.getSupportedLayers(fullState);
      expect(supportedLayers[0].initialDimensions).toHaveLength(1);
      expect(supportedLayers[0].initialDimensions![0]).toEqual(
        expect.objectContaining({
          groupId: GROUP_ID.MAX,
          staticValue: 0,
        })
      );
    });
  });

  describe('setting dimensions', () => {
    const state = {} as MetricVisualizationState;
    const columnId = 'col-id';

    const cases: Array<{
      groupId: (typeof GROUP_ID)[keyof typeof GROUP_ID];
      accessor: keyof MetricVisualizationState;
    }> = [
      { groupId: GROUP_ID.METRIC, accessor: 'metricAccessor' },
      { groupId: GROUP_ID.SECONDARY_METRIC, accessor: 'secondaryMetricAccessor' },
      { groupId: GROUP_ID.MAX, accessor: 'maxAccessor' },
      { groupId: GROUP_ID.BREAKDOWN_BY, accessor: 'breakdownByAccessor' },
      { groupId: GROUP_ID.TREND_METRIC, accessor: 'trendlineMetricAccessor' },
      { groupId: GROUP_ID.TREND_SECONDARY_METRIC, accessor: 'trendlineSecondaryMetricAccessor' },
      { groupId: GROUP_ID.TREND_TIME, accessor: 'trendlineTimeAccessor' },
      { groupId: GROUP_ID.TREND_BREAKDOWN_BY, accessor: 'trendlineBreakdownByAccessor' },
    ];

    it.each(cases)('sets %s', ({ groupId, accessor }) => {
      expect(
        visualization.setDimension({
          prevState: state,
          columnId,
          groupId,
          layerId: 'some-id',
          frame: mockFrameApi,
        })
      ).toEqual(
        expect.objectContaining({
          [accessor]: columnId,
        })
      );
    });

    it('shows the progress bar when maximum dimension set', () => {
      expect(
        visualization.setDimension({
          prevState: state,
          columnId,
          groupId: GROUP_ID.MAX,
          layerId: 'some-id',
          frame: mockFrameApi,
        })
      ).toEqual({
        maxAccessor: columnId,
        showBar: true,
      });
    });

    it('does NOT show the progress bar when maximum dimension set when trendline enabled', () => {
      expect(
        visualization.setDimension({
          prevState: { ...state, ...trendlineProps },
          columnId,
          groupId: GROUP_ID.MAX,
          layerId: 'some-id',
          frame: mockFrameApi,
        })
      ).not.toHaveProperty('showBar');
    });
  });

  describe('removing a dimension', () => {
    const removeDimensionParam: Parameters<
      Visualization<MetricVisualizationState>['removeDimension']
    >[0] = {
      layerId: 'some-id',
      columnId: '',
      frame: mockFrameApi,
      prevState: fullStateWTrend,
    };

    it('removes metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.metricAccessor!,
      });

      expect(removed).not.toHaveProperty('metricAccessor');
      expect(removed).not.toHaveProperty('palette');
      expect(removed).not.toHaveProperty('color');
    });
    it('removes secondary metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.secondaryMetricAccessor!,
      });

      expect(removed).not.toHaveProperty('secondaryMetricAccessor');
      expect(removed).not.toHaveProperty('secondaryPrefix');
    });
    it('removes max dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.maxAccessor!,
      });

      expect(removed).not.toHaveProperty('maxAccessor');
      expect(removed).not.toHaveProperty('progressDirection');
    });
    it('removes breakdown-by dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullState.breakdownByAccessor!,
      });

      expect(removed).not.toHaveProperty('breakdownByAccessor');
      expect(removed).not.toHaveProperty('collapseFn');
      expect(removed).not.toHaveProperty('maxCols');
    });
    it('removes trend time dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullStateWTrend.trendlineTimeAccessor,
      });

      expect(removed).not.toHaveProperty('trendlineTimeAccessor');
    });
    it('removes trend metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullStateWTrend.trendlineMetricAccessor,
      });

      expect(removed).not.toHaveProperty('trendlineMetricAccessor');
    });
    it('removes trend secondary metric dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullStateWTrend.trendlineSecondaryMetricAccessor,
      });

      expect(removed).not.toHaveProperty('trendlineSecondaryMetricAccessor');
    });
    it('removes trend breakdown-by dimension', () => {
      const removed = visualization.removeDimension({
        ...removeDimensionParam,
        columnId: fullStateWTrend.trendlineBreakdownByAccessor,
      });

      expect(removed).not.toHaveProperty('trendlineBreakdownByAccessor');
    });
  });

  it('implements custom display options', () => {
    expect(visualization.getDisplayOptions!()).toEqual({
      noPanelTitle: false,
      noPadding: true,
    });
  });

  describe('#getUserMessages', () => {
    it('returns error for non numeric primary metric if maxAccessor exists', () => {
      const frame = createMockFramePublicAPI({
        activeData: generateActiveData([
          {
            id: 'first',
            rows: Array(3).fill({ 'metric-col-id': '100', 'max-metric-col-id': 100 }),
          },
        ]),
      });
      expect(visualization.getUserMessages!(fullState, { frame })).toHaveLength(1);

      const frameNoErrors = createMockFramePublicAPI({
        activeData: generateActiveData([
          {
            id: 'first',
            rows: Array(3).fill({ 'metric-col-id': 30, 'max-metric-col-id': 100 }),
          },
        ]),
      });
      expect(visualization.getUserMessages!(fullState, { frame: frameNoErrors })).toHaveLength(0);
    });
  });
});
