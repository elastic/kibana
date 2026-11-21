/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { MlClient } from '../../../lib/ml_client';
import { DFA_EVALUATE_TOOL_ID } from '../tool_ids';
import { analysisTypeSchema } from './job_config';
import {
  dataResults,
  errorResults,
  formatDfaToolError,
  requireMlClient,
  type DfaToolDeps,
} from './tool_utils';

const schema = lazySchema(() =>
  z.object({
    index: z
      .string()
      .min(1)
      .max(256)
      .describe('Destination index that holds the analytics results and the ground truth.'),
    evaluation_type: analysisTypeSchema,
    actual_field: z
      .string()
      .min(1)
      .max(256)
      .describe('Ground-truth field. For supervised jobs this is the dependent variable.'),
    predicted_field: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Predicted field. Required for regression and classification, for example ml.FlightDelay_prediction. For outlier detection, defaults to {results_field}.outlier_score.'
      ),
    results_field: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe('Results object name. Default ml.'),
    class_name: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe('Classification only. Class used for AUC ROC. Omit to skip AUC.'),
    test_split_only: z
      .boolean()
      .optional()
      .describe(
        'For regression and classification, evaluate only documents where {results_field}.is_training is false. Default true. Ignored for outlier detection.'
      ),
  })
);

/**
 * Evaluate reads the results index as the current user via asSecondaryAuthUser.
 */
export const createDfaEvaluateTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_EVALUATE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Evaluate data frame analytics results against ground truth already stored on the destination index. Supervised metrics default to the test split (is_training false). Returns MSE, MSLE, Huber, and R-squared for regression; confusion matrix and accuracy for classification; precision, recall, confusion matrix, and AUC for outlier detection. Runs as the current user.',
  experimental: true,
  schema,
  handler: async (params, { esClient, savedObjectsClient, request }) => {
    const loaded = await requireMlClient(
      deps,
      request,
      esClient,
      savedObjectsClient,
      'canGetDataFrameAnalytics'
    );
    if ('error' in loaded) {
      return loaded.error;
    }

    const resultsField = params.results_field ?? 'ml';
    const testSplitOnly =
      params.test_split_only !== false && params.evaluation_type !== 'outlier_detection';
    const evaluation: Record<string, unknown> = {};
    let aucNote: string | undefined;

    if (params.evaluation_type === 'regression' || params.evaluation_type === 'classification') {
      if (!params.predicted_field) {
        return errorResults('predicted_field is required for regression and classification.');
      }
    }

    if (params.evaluation_type === 'regression') {
      evaluation.regression = {
        actual_field: params.actual_field,
        predicted_field: params.predicted_field,
        metrics: { r_squared: {}, mse: {}, msle: { offset: 1 }, huber: { delta: 1 } },
      };
    } else if (params.evaluation_type === 'classification') {
      const metrics: Record<string, unknown> = { multiclass_confusion_matrix: {}, accuracy: {} };
      if (params.class_name) {
        metrics.auc_roc = { class_name: params.class_name };
      } else {
        aucNote =
          'AUC ROC was omitted. Pass class_name, or set num_top_classes to -1 when creating the job and pass each class separately.';
      }
      evaluation.classification = {
        actual_field: params.actual_field,
        predicted_field: params.predicted_field,
        top_classes_field: `${resultsField}.top_classes`,
        metrics,
      };
    } else {
      evaluation.outlier_detection = {
        actual_field: params.actual_field,
        predicted_probability_field: params.predicted_field ?? `${resultsField}.outlier_score`,
        metrics: {
          auc_roc: { include_curve: false },
          precision: { at: [0.25, 0.5, 0.75] },
          recall: { at: [0.25, 0.5, 0.75] },
          confusion_matrix: { at: [0.25, 0.5, 0.75] },
        },
      };
    }

    const body: Record<string, unknown> = { index: params.index, evaluation };
    if (testSplitOnly) {
      body.query = { term: { [`${resultsField}.is_training`]: false } };
    }

    try {
      const metrics = await loaded.mlClient.evaluateDataFrame({
        body,
      } as Parameters<MlClient['evaluateDataFrame']>[0]);
      return dataResults({
        test_split_only: testSplitOnly,
        auc_roc: aucNote ?? 'included',
        metrics,
      });
    } catch (error) {
      return errorResults(formatDfaToolError('evaluate data frame analytics results', error));
    }
  },
});
