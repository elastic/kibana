/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexTemplate, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { castArray, groupBy, omit, uniq } from 'lodash';
import { ASSET_VERSION } from '../../../../../common/constants';
import type {
  ActionsByType,
  AppendProcessorToIngestPipelineAction,
  DeleteProcessorFromIngestPipelineAction,
  ElasticsearchAction,
  UpdateDefaultIngestPipelineAction,
} from './types';

export const MANAGED_BY_STREAMS = 'streams';

type ClassicStreamPipelineAction =
  | AppendProcessorToIngestPipelineAction
  | DeleteProcessorFromIngestPipelineAction;

/**
 * ClassicStreams sometimes share index templates and ingest pipelines (user managed or Streams managed)
 * In order to modify this pipelines in an atomic way and be able to clean up any Streams managed pipeline when no longer needed
 * We need to translate some actions
 */
export async function translateClassicStreamPipelineActions(
  actionsByType: ActionsByType,
  esClient: ElasticsearchClient
) {
  const maybeActions = [
    ...actionsByType.append_processor_to_ingest_pipeline,
    ...actionsByType.delete_processor_from_ingest_pipeline,
  ] as ClassicStreamPipelineAction[];

  if (maybeActions.length === 0) {
    return;
  }

  const actionsByPipeline = groupBy(maybeActions, 'pipeline');

  for (const [pipelineName, actions] of Object.entries(actionsByPipeline)) {
    const pipeline = await getPipeline(pipelineName, esClient);

    if (pipeline) {
      if (pipeline._meta?.managed_by === MANAGED_BY_STREAMS) {
        await updateExistingStreamsManagedPipeline({
          pipelineName,
          pipeline,
          actions,
          actionsByType,
        });
      } else {
        await updateExistingUserManagedPipeline({
          pipelineName,
          actions,
          actionsByType,
          esClient,
        });
      }
    } else {
      await createStreamsManagedPipeline({
        actions,
        actionsByType,
        esClient,
      });
    }
  }

  actionsByType.append_processor_to_ingest_pipeline = [];
  actionsByType.delete_processor_from_ingest_pipeline = [];
}

async function createStreamsManagedPipeline({
  actions,
  actionsByType,
  esClient,
}: {
  actions: ClassicStreamPipelineAction[];
  actionsByType: ActionsByType;
  esClient: ElasticsearchClient;
}) {
  assertOnlyAppendActions(actions);
  const targetTemplateNames = uniq(actions.map((action) => action.template));
  if (targetTemplateNames.length !== 1) {
    throw new Error('Append actions targeting the same new pipeline target different templates');
  }

  const indexTemplate = await getIndexTemplate(targetTemplateNames[0], esClient);
  const pipelineName = `${indexTemplate.name}-pipeline`;

  actionsByType.upsert_ingest_pipeline.push({
    type: 'upsert_ingest_pipeline',
    // All of these are ClassicStreams so take any stream name to use for the ordering of operations
    stream: actions[0].dataStream,
    request: {
      id: pipelineName,
      processors: actions.map((action) => action.processor),
      _meta: {
        description: `Streams managed pipeline to connect Classic streams to the Streams layer`,
        managed: true,
        managed_by: MANAGED_BY_STREAMS,
      },
      version: ASSET_VERSION,
    },
  });

  // Remove properties from the GET response that cannot be in the PUT request
  const { created_date_millis, modified_date_millis, ...safeTemplate } =
    indexTemplate.index_template as IndicesIndexTemplate & {
      created_date_millis: number;
      modified_date_millis: number;
    };

  actionsByType.upsert_index_template.push({
    type: 'upsert_index_template',
    request: {
      name: indexTemplate.name,
      ...safeTemplate,
      ignore_missing_component_templates: safeTemplate.ignore_missing_component_templates
        ? castArray(safeTemplate.ignore_missing_component_templates)
        : [],
      template: {
        ...(safeTemplate.template ?? {}),
        settings: {
          ...(safeTemplate.template?.settings ?? {}),
          index: {
            ...(safeTemplate.template?.settings?.index ?? {}),
            default_pipeline: pipelineName,
          },
        },
      },
    },
  });

  actionsByType.update_default_ingest_pipeline.push(
    ...actions.map<UpdateDefaultIngestPipelineAction>((action) => ({
      type: 'update_default_ingest_pipeline',
      request: {
        name: action.dataStream,
        pipeline: pipelineName,
      },
    }))
  );
}

async function updateExistingStreamsManagedPipeline({
  pipelineName,
  pipeline,
  actions,
  actionsByType,
}: {
  pipelineName: string;
  pipeline: IngestPipeline;
  actions: ClassicStreamPipelineAction[];
  actionsByType: ActionsByType;
}) {
  let processors = pipeline.processors ?? [];
  const existingPipelineProcessors = processors
    .filter((processor) => processor?.pipeline !== undefined)
    .map((processor) => processor!.pipeline!.name);

  for (const action of actions) {
    if (action.type === 'append_processor_to_ingest_pipeline') {
      if (!existingPipelineProcessors.includes(action.processor?.pipeline?.name ?? '')) {
        processors.push(action.processor);
      }
    } else {
      processors = processors.filter(
        (processor) =>
          processor?.pipeline === undefined || processor.pipeline.name !== action.referencePipeline
      );
    }
  }

  // If all the processors are removed, we just leave the ingest pipeline in place and referenced by the template
  // Since it's hard to correctly clean it up from all previous write indices which would allow us to delete the pipeline
  actionsByType.upsert_ingest_pipeline.push({
    type: 'upsert_ingest_pipeline',
    // All of these are ClassicStreams so take any stream name to use for the ordering of operations
    stream: actions[0].dataStream,
    request: {
      id: pipelineName,
      ...pipeline,
      processors,
    },
  });
}

async function updateExistingUserManagedPipeline({
  pipelineName,
  actions,
  actionsByType,
  esClient,
}: {
  pipelineName: string;
  actions: ClassicStreamPipelineAction[];
  actionsByType: ActionsByType;
  esClient: ElasticsearchClient;
}) {
  const referencePipelineNames = actions.map((action) => action.referencePipeline);
  const { targetPipelineName, targetPipeline } = await findPipelineToModify(
    pipelineName,
    referencePipelineNames,
    esClient
  );

  let processors = targetPipeline?.processors ?? [];
  const existingPipelineProcessors = processors
    .filter((processor) => processor?.pipeline !== undefined)
    .map((processor) => processor!.pipeline!.name);

  for (const action of actions) {
    if (action.type === 'append_processor_to_ingest_pipeline') {
      if (!existingPipelineProcessors.includes(action.processor?.pipeline?.name ?? '')) {
        processors.push(action.processor);
      }
    } else {
      processors = processors.filter(
        (processor) =>
          processor?.pipeline === undefined || processor.pipeline.name !== action.referencePipeline
      );
    }
  }

  actionsByType.upsert_ingest_pipeline.push({
    type: 'upsert_ingest_pipeline',
    // All of these are ClassicStreams so take any stream name to use for the ordering of operations
    stream: actions[0].dataStream,
    request: {
      id: targetPipelineName,
      ...(targetPipeline ?? {}),
      processors,
    },
  });
}

async function findPipelineToModify(
  pipelineName: string,
  referencePipelineNames: string[],
  esClient: ElasticsearchClient
): Promise<{
  targetPipelineName: string;
  targetPipeline: IngestPipeline | undefined;
}> {
  const pipeline = await getPipeline(pipelineName, esClient);

  if (!pipeline) {
    return {
      targetPipelineName: pipelineName,
      targetPipeline: undefined,
    };
  }

  const streamProcessor = pipeline.processors?.find(
    (processor) => processor?.pipeline && processor.pipeline.name.includes('@stream.')
  );

  if (streamProcessor) {
    return {
      targetPipelineName: pipelineName,
      targetPipeline: pipeline,
    };
  }

  const customProcessor = pipeline.processors?.findLast(
    (processor) => processor?.pipeline && processor.pipeline.name.endsWith('@custom')
  );

  if (customProcessor) {
    // go one level deeper, find the latest @custom leaf pipeline
    return await findPipelineToModify(
      customProcessor.pipeline!.name,
      referencePipelineNames,
      esClient
    );
  }

  return {
    targetPipelineName: pipelineName,
    targetPipeline: pipeline,
  };
}

async function getPipeline(id: string, esClient: ElasticsearchClient) {
  return (
    esClient.ingest
      .getPipeline({ id })
      // some keys on the pipeline can't be modified, so we need to clean them up
      // to avoid errors when updating the pipeline
      .then((response) => {
        if (!response[id]) {
          return undefined;
        }
        return omit(response[id], [
          'created_date_millis',
          'created_date',
          'modified_date_millis',
          'modified_date',
        ]);
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      })
  );
}

async function getIndexTemplate(name: string, esClient: ElasticsearchClient) {
  const indexTemplates = await esClient.indices.getIndexTemplate({
    name,
  });
  return indexTemplates.index_templates[0];
}

function assertOnlyAppendActions(
  actions: ElasticsearchAction[]
): asserts actions is AppendProcessorToIngestPipelineAction[] {
  const allAppendActions = actions.every(
    (action) => action.type === 'append_processor_to_ingest_pipeline'
  );

  if (!allAppendActions) {
    throw new Error('Expected only append_processor_to_ingest_pipeline actions');
  }
}
