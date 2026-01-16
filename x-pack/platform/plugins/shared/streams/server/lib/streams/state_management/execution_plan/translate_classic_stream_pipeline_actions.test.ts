/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  MANAGED_BY_STREAMS,
  translateClassicStreamPipelineActions,
} from './translate_classic_stream_pipeline_actions';
import type { ActionsByType } from './types';
import { ASSET_VERSION } from '../../../../../common/constants';

describe('translateClassicStreamPipelineActions', () => {
  describe('createStreamsManagedPipeline', () => {
    it('translates a single append action to a single upsert action', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        pipeline: 'my-template-pipeline',
        template: 'my-template',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: `ctx._index == 'my-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    name: 'my-datastream@stream.processing',
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
                managed: true,
                managed_by: 'streams',
              },
            },
          },
        ],
        upsert_index_template: [
          {
            type: 'upsert_index_template',
            request: {
              name: 'my-template',
              composed_of: [],
              index_patterns: 'my-*',
              ignore_missing_component_templates: [],
              template: {
                settings: {
                  index: {
                    default_pipeline: 'my-template-pipeline',
                  },
                },
              },
            },
          },
        ],
        update_default_ingest_pipeline: [
          {
            type: 'update_default_ingest_pipeline',
            request: {
              name: 'my-datastream',
              pipeline: 'my-template-pipeline',
            },
          },
        ],
      } as ActionsByType);
    });

    it('translates multiple append actions for the same pipeline to a single upsert action', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        pipeline: 'my-template-pipeline',
        template: 'my-template',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: `ctx._index == 'my-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        pipeline: 'my-template-pipeline',
        template: 'my-template',
        dataStream: 'my-other-datastream',
        referencePipeline: 'my-other-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-other-datastream@stream.processing',
            if: `ctx._index == 'my-other-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    name: 'my-datastream@stream.processing',
                  },
                },
                {
                  pipeline: {
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                    if: "ctx._index == 'my-other-datastream'",
                    ignore_missing_pipeline: true,
                    name: 'my-other-datastream@stream.processing',
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
                managed: true,
                managed_by: 'streams',
              },
            },
          },
        ],
        upsert_index_template: [
          {
            type: 'upsert_index_template',
            request: {
              name: 'my-template',
              composed_of: [],
              index_patterns: 'my-*',
              ignore_missing_component_templates: [],
              template: {
                settings: {
                  index: {
                    default_pipeline: 'my-template-pipeline',
                  },
                },
              },
            },
          },
        ],
        update_default_ingest_pipeline: [
          {
            type: 'update_default_ingest_pipeline',
            request: {
              name: 'my-datastream',
              pipeline: 'my-template-pipeline',
            },
          },
          {
            type: 'update_default_ingest_pipeline',
            request: {
              name: 'my-other-datastream',
              pipeline: 'my-template-pipeline',
            },
          },
        ],
      } as ActionsByType);
    });

    it('translates multiple append actions for different pipelines to multiple upsert actions', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        pipeline: 'my-template-pipeline',
        template: 'my-template',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: `ctx._index == 'my-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        pipeline: 'my-other-template-pipeline',
        template: 'my-other-template',
        dataStream: 'my-third-datastream',
        referencePipeline: 'my-third-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-third-datastream@stream.processing',
            if: `ctx._index == 'my-third-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.indices.getIndexTemplate
        .mockImplementationOnce(async () => ({
          index_templates: [
            {
              name: 'my-template',
              index_template: {
                composed_of: [],
                index_patterns: 'my-*',
              },
            },
          ],
        }))
        .mockImplementationOnce(async () => ({
          index_templates: [
            {
              name: 'my-other-template',
              index_template: {
                composed_of: [],
                index_patterns: 'my-*',
              },
            },
          ],
        }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    name: 'my-datastream@stream.processing',
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
                managed: true,
                managed_by: 'streams',
              },
            },
          },
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-third-datastream',
            request: {
              id: 'my-other-template-pipeline',
              processors: [
                {
                  pipeline: {
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                    if: "ctx._index == 'my-third-datastream'",
                    ignore_missing_pipeline: true,
                    name: 'my-third-datastream@stream.processing',
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
                managed: true,
                managed_by: 'streams',
              },
            },
          },
        ],
        upsert_index_template: [
          {
            type: 'upsert_index_template',
            request: {
              name: 'my-template',
              composed_of: [],
              index_patterns: 'my-*',
              ignore_missing_component_templates: [],
              template: {
                settings: {
                  index: {
                    default_pipeline: 'my-template-pipeline',
                  },
                },
              },
            },
          },
          {
            type: 'upsert_index_template',
            request: {
              name: 'my-other-template',
              composed_of: [],
              index_patterns: 'my-*',
              ignore_missing_component_templates: [],
              template: {
                settings: {
                  index: {
                    default_pipeline: 'my-other-template-pipeline',
                  },
                },
              },
            },
          },
        ],
        update_default_ingest_pipeline: [
          {
            type: 'update_default_ingest_pipeline',
            request: {
              name: 'my-datastream',
              pipeline: 'my-template-pipeline',
            },
          },
          {
            type: 'update_default_ingest_pipeline',
            request: {
              name: 'my-third-datastream',
              pipeline: 'my-other-template-pipeline',
            },
          },
        ],
      } as ActionsByType);
    });
  });

  describe('updateExistingStreamsManagedPipeline', () => {
    it('keeps the pipeline in an empty form if all processors are removed', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.delete_processor_from_ingest_pipeline.push({
        type: 'delete_processor_from_ingest_pipeline',
        dataStream: 'my-datastream',
        pipeline: 'my-template-pipeline',
        referencePipeline: 'my-datastream@stream.processing',
        template: 'my-template',
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline.mockImplementationOnce(async () => {
        return {
          'my-template-pipeline': {
            processors: [
              {
                pipeline: {
                  description:
                    "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  if: "ctx._index == 'my-datastream'",
                  ignore_missing_pipeline: true,
                  name: 'my-datastream@stream.processing',
                },
              },
            ],
            _meta: {
              managed_by: MANAGED_BY_STREAMS,
            },
          },
        };
      });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [],
              _meta: {
                managed_by: MANAGED_BY_STREAMS,
              },
            },
          },
        ],
      } as ActionsByType);
    });

    it('upserts only the pipeline if a processors is added', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        dataStream: 'my-other-datastream',
        pipeline: 'my-template-pipeline',
        referencePipeline: 'my-other-datastream@stream.processing',
        template: 'my-template',
        processor: {
          pipeline: {
            name: 'my-other-datastream@stream.processing',
            if: `ctx._index == 'my-other-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline.mockImplementationOnce(async () => {
        return {
          'my-template-pipeline': {
            processors: [
              {
                pipeline: {
                  name: 'my-datastream@stream.processing',
                  if: "ctx._index == 'my-datastream'",
                  ignore_missing_pipeline: true,
                  description:
                    "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                },
              },
            ],
            version: ASSET_VERSION,
            _meta: {
              managed_by: MANAGED_BY_STREAMS,
              managed: true,
              description:
                'Streams managed pipeline to connect Classic streams to the Streams layer',
            },
          },
        };
      });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-other-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    name: 'my-datastream@stream.processing',
                    if: `ctx._index == 'my-datastream'`,
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
                {
                  pipeline: {
                    name: 'my-other-datastream@stream.processing',
                    if: "ctx._index == 'my-other-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                managed_by: 'streams',
                managed: true,
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
              },
            },
          },
        ],
      } as ActionsByType);
    });

    it('upserts only the pipeline if a processors is added and one is removed', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        dataStream: 'my-other-datastream',
        pipeline: 'my-template-pipeline',
        referencePipeline: 'my-other-datastream@stream.processing',
        template: 'my-template',
        processor: {
          pipeline: {
            name: 'my-other-datastream@stream.processing',
            if: `ctx._index == 'my-other-datastream'`,
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });
      actionsByType.delete_processor_from_ingest_pipeline.push({
        type: 'delete_processor_from_ingest_pipeline',
        dataStream: 'my-datastream',
        pipeline: 'my-template-pipeline',
        referencePipeline: 'my-datastream@stream.processing',
        template: 'my-template',
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline.mockImplementationOnce(async () => {
        return {
          'my-template-pipeline': {
            processors: [
              {
                pipeline: {
                  name: 'my-datastream@stream.processing',
                  if: "ctx._index == 'my-datastream'",
                  ignore_missing_pipeline: true,
                  description:
                    "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                },
              },
            ],
            version: ASSET_VERSION,
            _meta: {
              managed_by: MANAGED_BY_STREAMS,
              managed: true,
              description:
                'Streams managed pipeline to connect Classic streams to the Streams layer',
            },
          },
        };
      });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-other-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    name: 'my-other-datastream@stream.processing',
                    if: "ctx._index == 'my-other-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
              version: ASSET_VERSION,
              _meta: {
                managed_by: 'streams',
                managed: true,
                description:
                  'Streams managed pipeline to connect Classic streams to the Streams layer',
              },
            },
          },
        ],
      } as ActionsByType);
    });
  });

  describe('updateExistingUserManagedPipeline', () => {
    it('performs an upsert with only the non streams processors if the last stream processor is removed', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.delete_processor_from_ingest_pipeline.push({
        type: 'delete_processor_from_ingest_pipeline',
        dataStream: 'my-datastream',
        pipeline: 'my-template-pipeline',
        referencePipeline: 'my-datastream@stream.processing',
        template: 'my-template',
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [], // Empty just to move the code forward, should be same as below
            },
          };
        })
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              created_date_millis: 123456789,
              created_date: '2023-10-01T00:00:00.000Z',
              modified_date_millis: 123456789,
              modified_date: '2023-10-01T00:00:00.000Z',
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'hello',
                  },
                },
                {
                  pipeline: {
                    name: 'my-datastream@stream.processing',
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
            },
          };
        });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'hello',
                  },
                },
              ],
            },
          },
        ],
      } as ActionsByType);
    });

    it('updates the existing pipeline directly if there is no streams processor or custom sub-pipeline', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        template: 'my-template',
        pipeline: 'my-template-pipeline',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: "ctx._index == 'my-datastream'",
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [],
            },
          };
        })
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [],
            },
          };
        });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    name: 'my-datastream@stream.processing',
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
            },
          },
        ],
      } as ActionsByType);
    });

    it('updates a sub pipeline if it finds a @custom pipeline processor', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        template: 'my-template',
        pipeline: 'my-template-pipeline',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: "ctx._index == 'my-datastream'",
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [],
            },
          };
        })
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [
                {
                  pipeline: {
                    name: 'logs@custom',
                  },
                },
              ],
            },
          };
        })
        .mockImplementationOnce(async () => {
          return {
            'logs@custom': {
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'hello',
                  },
                },
              ],
            },
          };
        });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'logs@custom',
              processors: [
                {
                  set: {
                    field: 'test',
                    value: 'hello',
                  },
                },
                {
                  pipeline: {
                    name: 'my-datastream@stream.processing',
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
            },
          },
        ],
      } as ActionsByType);
    });

    it('updates a sub pipeline if it finds an existing stream processor', async () => {
      const actionsByType = emptyActionsByType();
      actionsByType.append_processor_to_ingest_pipeline.push({
        type: 'append_processor_to_ingest_pipeline',
        template: 'my-template',
        pipeline: 'my-template-pipeline',
        dataStream: 'my-datastream',
        referencePipeline: 'my-datastream@stream.processing',
        processor: {
          pipeline: {
            name: 'my-datastream@stream.processing',
            if: "ctx._index == 'my-datastream'",
            ignore_missing_pipeline: true,
            description:
              "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
          },
        },
      });

      const clusterClient = elasticsearchServiceMock.createScopedClusterClient();
      clusterClient.asCurrentUser.ingest.getPipeline
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [],
            },
          };
        })
        .mockImplementationOnce(async () => {
          return {
            'my-template-pipeline': {
              processors: [
                {
                  pipeline: {
                    name: 'my-other-datastream@stream.processing',
                    if: "ctx._index == 'my-other-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
                {
                  pipeline: {
                    name: 'logs@custom',
                  },
                },
              ],
            },
          };
        });
      clusterClient.asCurrentUser.indices.getIndexTemplate.mockImplementationOnce(async () => ({
        index_templates: [
          {
            name: 'my-template',
            index_template: {
              composed_of: [],
              index_patterns: 'my-*',
            },
          },
        ],
      }));

      await translateClassicStreamPipelineActions(actionsByType, clusterClient);

      expect(actionsByType).toEqual({
        ...emptyActionsByType(),
        upsert_ingest_pipeline: [
          {
            type: 'upsert_ingest_pipeline',
            stream: 'my-datastream',
            request: {
              id: 'my-template-pipeline',
              processors: [
                {
                  pipeline: {
                    name: 'my-other-datastream@stream.processing',
                    if: "ctx._index == 'my-other-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
                {
                  pipeline: {
                    name: 'logs@custom',
                  },
                },
                {
                  pipeline: {
                    name: 'my-datastream@stream.processing',
                    if: "ctx._index == 'my-datastream'",
                    ignore_missing_pipeline: true,
                    description:
                      "Call the stream's managed pipeline - do not change this manually but instead use the streams UI or API",
                  },
                },
              ],
            },
          },
        ],
      } as ActionsByType);
    });
  });
});

function emptyActionsByType(): ActionsByType {
  return {
    upsert_component_template: [],
    delete_component_template: [],
    upsert_index_template: [],
    delete_index_template: [],
    upsert_ingest_pipeline: [],
    delete_ingest_pipeline: [],
    append_processor_to_ingest_pipeline: [],
    delete_processor_from_ingest_pipeline: [],
    upsert_datastream: [],
    update_lifecycle: [],
    rollover: [],
    delete_datastream: [],
    update_default_ingest_pipeline: [],
    upsert_dot_streams_document: [],
    delete_dot_streams_document: [],
    update_data_stream_mappings: [],
    delete_queries: [],
    unlink_assets: [],
    unlink_systems: [],
    unlink_features: [],
    update_ingest_settings: [],
    update_failure_store: [],
  };
}
