/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { createDataViewFn } from '@kbn/ml-data-view-utils/actions/create';
import { DataViewHandler } from '@kbn/ml-data-view-utils/actions/data_view_handler';
import type { MlClient } from '../../../lib/ml_client';
import { getDataViewsServiceFactory } from '../../../lib/data_views_utils';
import { DFA_CREATE_JOB_TOOL_ID } from '../tool_ids';
import { buildDfaConfig, createConfigSchema } from './job_config';
import {
  countSourceDocuments,
  dataResults,
  errorResults,
  formatDfaToolError,
  requireMlClient,
  type DfaToolDeps,
} from './tool_utils';

const schema = createConfigSchema;

/**
 * Create writes the job as the current user. MlClient.putDataFrameAnalytics uses
 * asSecondaryAuthUser, so source and destination index privileges are that user's.
 * This tool does not start the job. It also saves a data view titled with the destination index.
 */
export const createDfaCreateJobTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_CREATE_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Create a data frame analytics job and a data view titled with the destination index. Does not start the job. The data view is saved before the destination index is written, so Discover can open it after the job stops. An existing data view with that title is kept. Call ml.dfa_explain first. When training_percent is omitted, regression and classification count the source index: more than 100000 documents use 10, a few hundred documents such as about 700 use 60, and other sizes use 80. Runs as the current user, so a missing source or destination index privilege returns that user's security_exception. Leave hyperparameters unset so optimization fills them.",
  experimental: true,
  schema,
  handler: async (params, { esClient, savedObjectsClient, request }) => {
    const loaded = await requireMlClient(
      deps,
      request,
      esClient,
      savedObjectsClient,
      'canCreateDataFrameAnalytics'
    );
    if ('error' in loaded) {
      return loaded.error;
    }

    const sourceDocCount =
      params.analysis_type !== 'outlier_detection' && params.training_percent === undefined
        ? await countSourceDocuments(esClient, params.source_index)
        : undefined;
    const built = buildDfaConfig(params, { sourceDocCount });
    if (built.error || !built.built) {
      return errorResults(built.error ?? 'Invalid data frame analytics config.');
    }

    try {
      const response = await loaded.mlClient.putDataFrameAnalytics({
        id: params.id,
        body: built.built.body,
      } as Parameters<MlClient['putDataFrameAnalytics']>[0]);
      const dataView = await createDestinationDataView(
        deps,
        { esClient, savedObjectsClient, request },
        params.dest_index,
        params.id
      );
      return dataResults({
        created: true,
        id: params.id,
        started: false,
        training_percent_applied: built.built.training_percent_applied,
        notes: built.built.notes,
        config: built.built.body,
        response,
        ...dataView,
      });
    } catch (error) {
      return errorResults(formatDfaToolError('create the data frame analytics job', error));
    }
  },
});

/** Saves a data view titled with the destination index. The job is already created. */
async function createDestinationDataView(
  deps: DfaToolDeps,
  context: Pick<ToolHandlerContext, 'esClient' | 'savedObjectsClient' | 'request'>,
  dataViewName: string,
  jobId: string
): Promise<{
  data_view_created: boolean;
  data_view_id?: string;
  data_view_existed?: boolean;
  data_view_error?: string;
}> {
  if (!deps.getDataViews) {
    return {
      data_view_created: false,
      data_view_error: `Data views service is unavailable, so the data view for "${dataViewName}" was not created. The job was created.`,
    };
  }
  try {
    const dataViewsService = await getDataViewsServiceFactory(
      deps.getDataViews,
      context.savedObjectsClient,
      context.esClient,
      context.request
    )();
    const existingId = await new DataViewHandler(dataViewsService).getDataViewId(dataViewName);
    if (existingId) {
      return { data_view_created: false, data_view_id: existingId, data_view_existed: true };
    }
    const { dataViewsCreated, dataViewsErrors } = await createDataViewFn({
      dataViewsService,
      dataViewName,
      runtimeMappings: {},
      errorFallbackId: jobId,
    });
    const createdId = dataViewsCreated[0]?.id;
    if (createdId) {
      return { data_view_created: true, data_view_id: createdId };
    }
    const error = dataViewsErrors[0]?.error;
    const reason = error instanceof Error ? error.message : 'the data view could not be created';
    return {
      data_view_created: false,
      data_view_error: `Could not create the data view for "${dataViewName}": ${reason}. The job was created.`,
    };
  } catch (error) {
    return {
      data_view_created: false,
      data_view_error: `${formatDfaToolError(
        `create the data view for '${dataViewName}'`,
        error
      )} The job was created.`,
    };
  }
}
