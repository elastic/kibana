/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { deleteDataViewFn } from '@kbn/ml-data-view-utils/actions/delete';
import { getDataViewsServiceFactory } from '../../../lib/data_views_utils';
import { DFA_DELETE_JOB_TOOL_ID } from '../tool_ids';
import { jobIdSchema } from './job_config';
import {
  dataResults,
  errorResults,
  formatDfaToolError,
  jobsFrom,
  requireMlClient,
  type DfaToolDeps,
} from './tool_utils';

const schema = lazySchema(() =>
  z.object({
    job_id: jobIdSchema,
    dest_index: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Destination index from ml.dfa_get_job. Deleting the job always deletes this index, every document in it, and the data view with the same title. When omitted, the tool uses the index stored on the job. A name that does not match the job is rejected.'
      ),
    force: z
      .boolean()
      .optional()
      .describe(
        'Delete the job even if it is running. Default false. Do not set this unless the user asked to delete a running job.'
      ),
  })
);

/**
 * Data frame analytics configs have no groups field, so the anomaly detection
 * ml-agent-scratch guard does not apply. Confirmation is the guard.
 * Skill-bounded tools cannot set annotations.destructiveHint.
 */
export const createDfaDeleteJobTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_DELETE_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Delete a data frame analytics job, its destination index and every document in that index, and the data view whose title matches the destination index. Always asks the user to confirm, and the confirmation names the destination index. Pass dest_index from ml.dfa_get_job when it is known. force defaults to false. There is no scratch-group guard because data frame analytics jobs have no groups.',
  experimental: true,
  schema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const force = toolParams.force === true;
      const destIndex =
        toolParams.dest_index ?? (await lookupDestinationIndex(deps, context, toolParams.job_id));
      const destLine = destIndex
        ? i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmDeleteIndex', {
            defaultMessage:
              'The destination index "{destIndex}", every document in it, and the data view with that title will also be deleted. This cannot be undone.',
            values: { destIndex },
          })
        : i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmDeleteIndexUnknown', {
            defaultMessage:
              'The destination index, every document in it, and the data view with that title will also be deleted. This cannot be undone.',
          });
      const forceLine = force
        ? i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmForce', {
            defaultMessage: 'force: true. The job is deleted even if it is still running.',
          })
        : i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmNoForce', {
            defaultMessage: 'force: false.',
          });
      return {
        title: i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmTitle', {
          defaultMessage: 'Delete data frame analytics job {jobId}',
          values: { jobId: toolParams.job_id },
        }),
        message: i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmMessage', {
          defaultMessage: 'Delete data frame analytics job "{jobId}". {destLine} {forceLine}',
          values: { jobId: toolParams.job_id, destLine, forceLine },
        }),
        confirm_text: i18n.translate('xpack.ml.agentBuilder.dfa.deleteJob.confirmButton', {
          defaultMessage: 'Delete job',
        }),
        color: 'danger',
      };
    },
  },
  handler: async (
    { job_id: jobId, dest_index: destIndex, force },
    { esClient, savedObjectsClient, request }
  ) => {
    const forceDelete = force === true;
    const loaded = await requireMlClient(
      deps,
      request,
      esClient,
      savedObjectsClient,
      'canDeleteDataFrameAnalytics'
    );
    if ('error' in loaded) {
      return loaded.error;
    }

    let actualDest: string | undefined;
    try {
      const response = await loaded.mlClient.getDataFrameAnalytics({ id: jobId });
      const job = jobsFrom(response)[0];
      if (!job) {
        return errorResults(`Job not found: ${jobId}`);
      }
      actualDest = job.dest?.index;
    } catch (error) {
      return errorResults(formatDfaToolError(`read data frame analytics job ${jobId}`, error));
    }

    if (destIndex && actualDest !== destIndex) {
      return errorResults(
        `dest_index "${destIndex}" does not match the job destination index "${
          actualDest ?? ''
        }". The job was not deleted.`
      );
    }

    if (actualDest) {
      try {
        await esClient.asCurrentUser.indices.delete({ index: actualDest });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode !== 404) {
          return errorResults(
            formatDfaToolError(`delete destination index '${actualDest}'`, error)
          );
        }
      }

      const dataViewResult = await deleteDestinationDataView(
        deps,
        { esClient, savedObjectsClient, request },
        actualDest
      );
      if (dataViewResult.error) {
        return errorResults(dataViewResult.error);
      }
    }

    try {
      const response = await loaded.mlClient.deleteDataFrameAnalytics({
        id: jobId,
        force: forceDelete,
      });
      return dataResults({
        deleted: true,
        id: jobId,
        destination_index: actualDest,
        destination_index_deleted: Boolean(actualDest),
        data_view_deleted: Boolean(actualDest),
        force: forceDelete,
        response,
      });
    } catch (error) {
      return errorResults(formatDfaToolError(`delete data frame analytics job ${jobId}`, error));
    }
  },
});

async function deleteDestinationDataView(
  deps: DfaToolDeps,
  context: Pick<ToolHandlerContext, 'esClient' | 'savedObjectsClient' | 'request'>,
  dataViewName: string
): Promise<{ error?: string }> {
  if (!deps.getDataViews) {
    return {
      error: `Data views service is unavailable, so the data view for "${dataViewName}" was not deleted. The destination index was already deleted. The job was not deleted.`,
    };
  }
  try {
    const dataViewsService = await getDataViewsServiceFactory(
      deps.getDataViews,
      context.savedObjectsClient,
      context.esClient,
      context.request
    )();
    const deleted = await deleteDataViewFn({ dataViewsService, dataViewName });
    if (!deleted.success) {
      const reason =
        deleted.error instanceof Error
          ? deleted.error.message
          : 'the data view could not be deleted';
      return {
        error: `Could not delete the data view for "${dataViewName}": ${reason}. The destination index was already deleted. The job was not deleted.`,
      };
    }
    return {};
  } catch (error) {
    return {
      error: formatDfaToolError(`delete the data view for '${dataViewName}'`, error),
    };
  }
}

async function lookupDestinationIndex(
  deps: DfaToolDeps,
  context: ToolHandlerContext,
  jobId: string
): Promise<string | undefined> {
  const loaded = await requireMlClient(
    deps,
    context.request,
    context.esClient,
    context.savedObjectsClient,
    'canDeleteDataFrameAnalytics'
  );
  if ('error' in loaded) {
    return undefined;
  }
  try {
    const response = await loaded.mlClient.getDataFrameAnalytics({ id: jobId });
    return jobsFrom(response)[0]?.dest?.index;
  } catch {
    return undefined;
  }
}
