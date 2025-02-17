/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import { OPENAI_TITLE, OPENAI_CONNECTOR_ID } from '../../../../common/openai/constants';
import { BEDROCK_TITLE, BEDROCK_CONNECTOR_ID } from '../../../../common/bedrock/constants';
import { GEMINI_TITLE, GEMINI_CONNECTOR_ID } from '../../../../common/gemini/constants';
import {
  INFERENCE_CONNECTOR_TITLE,
  INFERENCE_CONNECTOR_ID,
} from '../../../../common/inference/constants';

export const getDashboardTitle = (title: string) => `${title} Token Usage`;

export const getDashboard = (
  genAIProvider: 'OpenAI' | 'Bedrock' | 'Gemini' | 'Inference',
  dashboardId: string
): SavedObject => {
  let attributes = {
    provider: OPENAI_TITLE,
    dashboardTitle: getDashboardTitle(OPENAI_TITLE),
    actionTypeId: OPENAI_CONNECTOR_ID,
  };

  if (genAIProvider === 'OpenAI') {
    attributes = {
      provider: OPENAI_TITLE,
      dashboardTitle: getDashboardTitle(OPENAI_TITLE),
      actionTypeId: OPENAI_CONNECTOR_ID,
    };
  } else if (genAIProvider === 'Bedrock') {
    attributes = {
      provider: BEDROCK_TITLE,
      dashboardTitle: getDashboardTitle(BEDROCK_TITLE),
      actionTypeId: BEDROCK_CONNECTOR_ID,
    };
  } else if (genAIProvider === 'Gemini') {
    attributes = {
      provider: GEMINI_TITLE,
      dashboardTitle: getDashboardTitle(GEMINI_TITLE),
      actionTypeId: GEMINI_CONNECTOR_ID,
    };
  } else if (genAIProvider === 'Inference') {
    attributes = {
      provider: INFERENCE_CONNECTOR_TITLE,
      dashboardTitle: getDashboardTitle(INFERENCE_CONNECTOR_TITLE),
      actionTypeId: INFERENCE_CONNECTOR_ID,
    };
  }

  const ids: Record<string, string> = {
    genAiSavedObjectId: dashboardId,
    tokens: uuidv4(),
    totalTokens: uuidv4(),
    tag: uuidv4(),
  };
  return {
    attributes: {
      description: `Displays ${attributes.provider} token consumption per Kibana user`,
      kibanaSavedObjectMeta: {
        searchSourceJSON: `{"query":{"query":"kibana.saved_objects: { type_id  : \\"${attributes.actionTypeId}\\" } ","language":"kuery"},"filter":[]}`,
      },
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON: JSON.stringify([
        {
          version: '8.9.0',
          type: 'visualization',
          gridData: {
            x: 0,
            y: 0,
            w: 48,
            h: 4,
            i: '1c425103-57a6-4598-a092-03b8d550b440',
          },
          panelIndex: '1c425103-57a6-4598-a092-03b8d550b440',
          embeddableConfig: {
            savedVis: {
              id: '',
              title: '',
              description: '',
              type: 'markdown',
              params: {
                fontSize: 12,
                openLinksInNewTab: false,
                markdown:
                  // TODO: update with better copy and link to the docs page for the Gen AI connector before 8.9 release!
                  'The data powering this dashboard requires special index permissions. To access the dashboard data, contact a Kibana admin to set up a "read only" role for non-admin users who may want to view this dashboard. ',
              },
              uiState: {},
              data: {
                aggs: [],
                searchSource: {
                  query: {
                    query: '',
                    language: 'kuery',
                  },
                  filter: [],
                },
              },
            },
            hidePanelTitles: false,
            enhancements: {},
          },
          title: 'Permissions note',
        },
        {
          version: '8.9.0',
          type: 'lens',
          gridData: {
            x: 0,
            y: 0,
            w: 48,
            h: 20,
            i: '1e45fe29-05d3-4dbd-a0bb-fc3bc5ee3d6d',
          },
          panelIndex: '1e45fe29-05d3-4dbd-a0bb-fc3bc5ee3d6d',
          embeddableConfig: {
            attributes: {
              title: '',
              description: '',
              visualizationType: 'lnsXY',
              type: 'lens',
              references: [],
              state: {
                visualization: {
                  title: 'Empty XY chart',
                  legend: {
                    isVisible: true,
                    position: 'right',
                  },
                  valueLabels: 'hide',
                  preferredSeriesType: 'bar_stacked',
                  layers: [
                    {
                      layerId: '475e8ca0-e78e-454a-8597-a5492f70dce3',
                      accessors: [
                        '0f9814ec-0964-4efa-93a3-c7f173df2483',
                        'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                      ],
                      position: 'top',
                      seriesType: 'bar_stacked',
                      showGridlines: false,
                      layerType: 'data',
                      xAccessor: '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519',
                      yConfig: [
                        {
                          forAccessor: '0f9814ec-0964-4efa-93a3-c7f173df2483',
                          color: '#9170b8',
                        },
                        {
                          forAccessor: 'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                          color: '#3383cd',
                        },
                      ],
                    },
                  ],
                  labelsOrientation: {
                    x: 0,
                    yLeft: 0,
                    yRight: 0,
                  },
                  yTitle: `Sum of ${attributes.provider} Completion + Prompt Tokens`,
                  axisTitlesVisibilitySettings: {
                    x: true,
                    yLeft: true,
                    yRight: true,
                  },
                },
                query: {
                  query: `kibana.saved_objects:{ type_id: "${attributes.actionTypeId}"   }`,
                  language: 'kuery',
                },
                filters: [],
                datasourceStates: {
                  formBased: {
                    layers: {
                      '475e8ca0-e78e-454a-8597-a5492f70dce3': {
                        columns: {
                          '0f9814ec-0964-4efa-93a3-c7f173df2483': {
                            label: `${attributes.provider} Completion Tokens`,
                            dataType: 'number',
                            operationType: 'sum',
                            sourceField: 'kibana.action.execution.gen_ai.usage.completion_tokens',
                            isBucketed: false,
                            scale: 'ratio',
                            params: {
                              emptyAsNull: true,
                            },
                            customLabel: true,
                          },
                          '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519': {
                            label: 'user.name',
                            dataType: 'string',
                            operationType: 'terms',
                            scale: 'ordinal',
                            sourceField: 'user.name',
                            isBucketed: true,
                            params: {
                              size: 10000,
                              orderBy: {
                                type: 'custom',
                              },
                              orderDirection: 'desc',
                              otherBucket: true,
                              missingBucket: false,
                              parentFormat: {
                                id: 'terms',
                              },
                              include: [],
                              exclude: [],
                              includeIsRegex: false,
                              excludeIsRegex: false,
                              orderAgg: {
                                label: 'Sum of kibana.action.execution.openai.usage.total_tokens',
                                dataType: 'number',
                                operationType: 'sum',
                                sourceField: 'kibana.action.execution.gen_ai.usage.total_tokens',
                                isBucketed: false,
                                scale: 'ratio',
                                params: {
                                  emptyAsNull: true,
                                },
                              },
                              secondaryFields: [],
                            },
                            customLabel: true,
                          },
                          'b0e390e4-d754-4eb4-9fcc-4347dadda394': {
                            label: `${attributes.provider} Prompt Tokens`,
                            dataType: 'number',
                            operationType: 'sum',
                            sourceField: 'kibana.action.execution.gen_ai.usage.prompt_tokens',
                            isBucketed: false,
                            scale: 'ratio',
                            params: {
                              emptyAsNull: true,
                            },
                            customLabel: true,
                          },
                        },
                        columnOrder: [
                          '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519',
                          '0f9814ec-0964-4efa-93a3-c7f173df2483',
                          'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                        ],
                        sampling: 1,
                        incompleteColumns: {},
                      },
                    },
                  },
                  textBased: {
                    layers: {},
                  },
                },
                internalReferences: [
                  {
                    type: 'index-pattern',
                    id: ids.tokens,
                    name: 'indexpattern-datasource-layer-475e8ca0-e78e-454a-8597-a5492f70dce3',
                  },
                ],
                adHocDataViews: {
                  [ids.tokens]: {
                    id: ids.tokens,
                    title: '.kibana-event-log-*',
                    timeFieldName: '@timestamp',
                    sourceFilters: [],
                    fieldFormats: {},
                    runtimeFieldMap: {
                      'kibana.action.execution.gen_ai.usage.completion_tokens': {
                        type: 'long',
                      },
                      'kibana.action.execution.gen_ai.usage.prompt_tokens': {
                        type: 'long',
                      },
                    },
                    fieldAttrs: {},
                    allowNoIndex: false,
                    name: 'Event Log',
                  },
                },
              },
            },
            hidePanelTitles: false,
            enhancements: {},
          },
          title: 'Prompt + Completion Tokens per User',
        },
        {
          version: '8.9.0',
          type: 'lens',
          gridData: {
            x: 0,
            y: 20,
            w: 48,
            h: 20,
            i: '80f745c6-a18b-492b-bacf-4a2499a2f95d',
          },
          panelIndex: '80f745c6-a18b-492b-bacf-4a2499a2f95d',
          embeddableConfig: {
            attributes: {
              title: '',
              description: '',
              visualizationType: 'lnsXY',
              type: 'lens',
              references: [],
              state: {
                visualization: {
                  title: 'Empty XY chart',
                  legend: {
                    isVisible: true,
                    position: 'right',
                  },
                  valueLabels: 'hide',
                  preferredSeriesType: 'bar_stacked',
                  layers: [
                    {
                      layerId: '475e8ca0-e78e-454a-8597-a5492f70dce3',
                      accessors: ['b0e390e4-d754-4eb4-9fcc-4347dadda394'],
                      position: 'top',
                      seriesType: 'bar_stacked',
                      showGridlines: false,
                      layerType: 'data',
                      xAccessor: '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519',
                      yConfig: [
                        {
                          forAccessor: 'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                          color: '#332182',
                        },
                      ],
                    },
                  ],
                },
                query: {
                  query: `kibana.saved_objects: { type_id  : "${attributes.actionTypeId}" } `,
                  language: 'kuery',
                },
                filters: [],
                datasourceStates: {
                  formBased: {
                    layers: {
                      '475e8ca0-e78e-454a-8597-a5492f70dce3': {
                        columns: {
                          '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519': {
                            label: 'user.name',
                            dataType: 'string',
                            operationType: 'terms',
                            scale: 'ordinal',
                            sourceField: 'user.name',
                            isBucketed: true,
                            params: {
                              size: 10000,
                              orderBy: {
                                type: 'column',
                                columnId: 'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                              },
                              orderDirection: 'desc',
                              otherBucket: true,
                              missingBucket: false,
                              parentFormat: {
                                id: 'terms',
                              },
                              include: [],
                              exclude: [],
                              includeIsRegex: false,
                              excludeIsRegex: false,
                            },
                            customLabel: true,
                          },
                          'b0e390e4-d754-4eb4-9fcc-4347dadda394': {
                            label: `Sum of ${attributes.provider} Total Tokens`,
                            dataType: 'number',
                            operationType: 'sum',
                            sourceField: 'kibana.action.execution.gen_ai.usage.total_tokens',
                            isBucketed: false,
                            scale: 'ratio',
                            params: {
                              emptyAsNull: true,
                            },
                            customLabel: true,
                          },
                        },
                        columnOrder: [
                          '5352fcb2-7b8e-4b5a-bce9-73a7f3b2b519',
                          'b0e390e4-d754-4eb4-9fcc-4347dadda394',
                        ],
                        sampling: 1,
                        incompleteColumns: {},
                      },
                    },
                  },
                  textBased: {
                    layers: {},
                  },
                },
                internalReferences: [
                  {
                    type: 'index-pattern',
                    id: ids.totalTokens,
                    name: 'indexpattern-datasource-layer-475e8ca0-e78e-454a-8597-a5492f70dce3',
                  },
                ],
                adHocDataViews: {
                  [ids.totalTokens]: {
                    id: ids.totalTokens,
                    title: '.kibana-event-log-*',
                    timeFieldName: '@timestamp',
                    sourceFilters: [],
                    fieldFormats: {},
                    runtimeFieldMap: {
                      'kibana.action.execution.gen_ai.usage.total_tokens': {
                        type: 'long',
                      },
                    },
                    fieldAttrs: {},
                    allowNoIndex: false,
                    name: 'Event Log',
                  },
                },
              },
            },
            hidePanelTitles: false,
            enhancements: {},
          },
          title: 'Total Tokens per User',
        },
      ]),
      timeRestore: false,
      title: attributes.dashboardTitle,
      version: 1,
    },
    coreMigrationVersion: '8.8.0',
    created_at: '2023-06-01T19:00:04.629Z',
    id: ids.genAiSavedObjectId,
    managed: false,
    type: 'dashboard',
    typeMigrationVersion: '8.7.0',
    updated_at: '2023-06-01T19:00:04.629Z',
    references: [],
  };
};
