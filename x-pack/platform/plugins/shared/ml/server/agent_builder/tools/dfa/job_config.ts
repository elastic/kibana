/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const JOB_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
export const DEFAULT_TRAINING_PERCENT = 80;
export const TRAINING_DOCS_LOWER = 200;
export const TRAINING_DOCS_UPPER = 200000;
export const MAX_FEATURE_IMPORTANCE = 30;

const fieldName = lazySchema(() => z.string().min(1).max(256));
const fieldList = lazySchema(() => z.array(fieldName).max(50));
const memoryLimit = lazySchema(() =>
  z
    .string()
    .max(20)
    .regex(/^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb|tb)$/i)
);

export const jobIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(64)
    .regex(
      JOB_ID_PATTERN,
      'Job id must be lowercase and contain only letters, numbers, underscores, and hyphens.'
    )
);

export const analysisTypeSchema = lazySchema(() =>
  z.enum(['outlier_detection', 'regression', 'classification'])
);

const optionalConfigFields = {
  results_field: lazySchema(() => z.string().min(1).max(64).optional()),
  dependent_variable: lazySchema(() => fieldName.optional()),
  training_percent: lazySchema(() => z.number().int().min(1).max(100).optional()),
  prediction_field_name: lazySchema(() => fieldName.optional()),
  num_top_classes: lazySchema(() => z.number().int().min(-1).max(100).optional()),
  num_top_feature_importance_values: lazySchema(() =>
    z.number().int().min(0).max(MAX_FEATURE_IMPORTANCE).optional()
  ),
  class_assignment_objective: lazySchema(() =>
    z.enum(['maximize_accuracy', 'maximize_minimum_recall']).optional()
  ),
  loss_function: lazySchema(() => z.enum(['mse', 'msle', 'huber']).optional()),
  huber_delta: lazySchema(() => z.number().positive().max(1_000_000).optional()),
  outlier_fraction: lazySchema(() =>
    z
      .number()
      .gt(0)
      .lt(1)
      .optional()
      .describe(
        'Outlier detection only. Share of rows expected to be unusual, for example 0.3. Omit to keep the default of about 0.05. Do not set neighbor count or method.'
      )
  ),
  includes: lazySchema(() => fieldList.optional()),
  excludes: lazySchema(() => fieldList.optional()),
  model_memory_limit: lazySchema(() => memoryLimit.optional()),
  max_num_threads: lazySchema(() => z.number().int().min(1).max(256).optional()),
  description: lazySchema(() => z.string().max(1000).optional()),
};

export const createConfigSchema = lazySchema(() =>
  z.object({
    id: jobIdSchema,
    source_index: z.string().min(1).max(256),
    dest_index: z.string().min(1).max(256),
    analysis_type: analysisTypeSchema,
    ...optionalConfigFields,
  })
);

export const explainConfigSchema = lazySchema(() =>
  z.object({
    job_id: jobIdSchema.optional(),
    source_index: z.string().min(1).max(256).optional(),
    dest_index: z.string().min(1).max(256).optional(),
    analysis_type: analysisTypeSchema.optional(),
    ...optionalConfigFields,
  })
);

export type DfaConfigInput = z.infer<typeof createConfigSchema>;

export interface BuiltDfaConfig {
  body: Record<string, unknown>;
  notes: string[];
  training_percent_applied?: number;
}

/**
 * Picks a supervised training percent from the source document count.
 * More than 100000 documents start at 10. A few hundred documents, including about 700, use 60.
 * Other sizes use 80. The result stays inside the 200 to 200000 training-document bounds.
 */
export function trainingPercentForSourceSize(docCount: number): number {
  let percent = 80;
  if (docCount > 100_000) {
    percent = 10;
  } else if (docCount < 2_000) {
    percent = 60;
  }

  const trainingDocs = Math.round((docCount * percent) / 100);
  if (trainingDocs > TRAINING_DOCS_UPPER) {
    return Math.max(1, Math.floor((TRAINING_DOCS_UPPER / docCount) * 100));
  }
  if (trainingDocs < TRAINING_DOCS_LOWER && docCount >= TRAINING_DOCS_LOWER) {
    return Math.min(99, Math.ceil((TRAINING_DOCS_LOWER / docCount) * 100));
  }
  return percent;
}

/** Builds a put/explain body. Supervised jobs choose training_percent from the source size when it is omitted. */
export function buildDfaConfig(
  input: DfaConfigInput,
  options?: { sourceDocCount?: number }
): { error?: string; built?: BuiltDfaConfig } {
  const notes: string[] = [];
  const supervised = input.analysis_type !== 'outlier_detection';

  if (supervised && input.outlier_fraction !== undefined) {
    return { error: 'outlier_fraction applies only to outlier detection.' };
  }

  if (!supervised) {
    const supervisedOnly =
      input.dependent_variable !== undefined ||
      input.training_percent !== undefined ||
      input.prediction_field_name !== undefined ||
      input.num_top_classes !== undefined ||
      input.num_top_feature_importance_values !== undefined ||
      input.class_assignment_objective !== undefined ||
      input.loss_function !== undefined ||
      input.huber_delta !== undefined;
    if (supervisedOnly) {
      return {
        error:
          'Outlier detection does not take a dependent variable, training percent, prediction field, class options, loss function, or feature-importance count.',
      };
    }
  } else if (!input.dependent_variable) {
    return { error: 'dependent_variable is required for regression and classification.' };
  }

  if (
    input.analysis_type === 'regression' &&
    (input.class_assignment_objective || input.num_top_classes !== undefined)
  ) {
    return {
      error: 'class_assignment_objective and num_top_classes apply only to classification.',
    };
  }
  if (
    input.analysis_type === 'classification' &&
    (input.loss_function || input.huber_delta !== undefined)
  ) {
    return { error: 'loss_function and huber_delta apply only to regression.' };
  }
  if (input.loss_function !== 'huber' && input.huber_delta !== undefined) {
    return { error: 'huber_delta applies only when loss_function is huber.' };
  }

  const analysisBody: Record<string, unknown> = {};
  let trainingPercentApplied: number | undefined;
  if (supervised) {
    if (input.training_percent !== undefined) {
      trainingPercentApplied = input.training_percent;
    } else if (options?.sourceDocCount !== undefined) {
      trainingPercentApplied = trainingPercentForSourceSize(options.sourceDocCount);
      notes.push(
        `Source has ${options.sourceDocCount} documents, so training_percent is ${trainingPercentApplied}. More than 100000 documents start at 10. A few hundred documents, such as about 700, use 60. Other sizes use 80. Training documents stay between ${TRAINING_DOCS_LOWER} and ${TRAINING_DOCS_UPPER}.`
      );
    } else {
      trainingPercentApplied = DEFAULT_TRAINING_PERCENT;
      notes.push(
        'training_percent omitted and the source size could not be counted; applied 80 so 20 percent of rows stay available for testing. Elasticsearch would otherwise use 100 and leave no test split. More than 100000 documents should use 10. A few hundred documents, such as about 700, should use 60.'
      );
    }
    if (trainingPercentApplied === 100) {
      notes.push(
        'training_percent is 100. Every eligible document is used for training, so there is no test split.'
      );
    }
    notes.push(
      `Keep training documents between ${TRAINING_DOCS_LOWER} and ${TRAINING_DOCS_UPPER}. Lower the percent when source docs times the percent would exceed ${TRAINING_DOCS_UPPER}. Raise it when that product would fall under ${TRAINING_DOCS_LOWER}, but not to 100 unless the user accepts no test split.`
    );
    analysisBody.dependent_variable = input.dependent_variable;
    analysisBody.training_percent = trainingPercentApplied;
    if (input.prediction_field_name) {
      analysisBody.prediction_field_name = input.prediction_field_name;
    }
    if (input.num_top_feature_importance_values === undefined) {
      notes.push(
        'num_top_feature_importance_values omitted. Per-document feature importance is not stored. When the user wants a reason for each row, set it to a handful of the strongest fields, such as 4, and at most 30.'
      );
    } else {
      analysisBody.num_top_feature_importance_values = input.num_top_feature_importance_values;
    }
  }

  if (input.analysis_type === 'classification') {
    if (input.num_top_classes !== undefined) {
      analysisBody.num_top_classes = input.num_top_classes;
    }
    if (input.class_assignment_objective) {
      analysisBody.class_assignment_objective = input.class_assignment_objective;
    }
  }
  if (!supervised) {
    if (input.outlier_fraction !== undefined) {
      analysisBody.outlier_fraction = input.outlier_fraction;
    } else {
      notes.push(
        'outlier_fraction omitted. Elasticsearch assumes about 0.05, or 5 in 100 rows, are unusual. Set it only when the user knows a different share.'
      );
    }
  }
  if (input.analysis_type === 'regression' && input.loss_function) {
    analysisBody.loss_function = input.loss_function;
    if (input.loss_function === 'huber' && input.huber_delta !== undefined) {
      analysisBody.loss_function_parameter = input.huber_delta;
    }
  }

  const body: Record<string, unknown> = {
    source: { index: [input.source_index] },
    dest: {
      index: input.dest_index,
      results_field: input.results_field ?? 'ml',
    },
    analysis: { [input.analysis_type]: analysisBody },
  };
  if (input.description) {
    body.description = input.description;
  }
  if (input.includes?.length || input.excludes?.length) {
    body.analyzed_fields = {
      ...(input.includes?.length ? { includes: input.includes } : {}),
      ...(input.excludes?.length ? { excludes: input.excludes } : {}),
    };
  }
  if (input.model_memory_limit) {
    body.model_memory_limit = input.model_memory_limit.replace(/\s+/g, '');
  }
  if (input.max_num_threads !== undefined) {
    body.max_num_threads = input.max_num_threads;
  }

  return { built: { body, notes, training_percent_applied: trainingPercentApplied } };
}
