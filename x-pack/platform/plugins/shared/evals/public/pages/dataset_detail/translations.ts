/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BREADCRUMB_EVALUATIONS = i18n.translate(
  'xpack.evals.datasetDetail.breadcrumbEvaluations',
  {
    defaultMessage: 'Evaluations',
  }
);

export const BREADCRUMB_DATASETS = i18n.translate('xpack.evals.datasetDetail.breadcrumbDatasets', {
  defaultMessage: 'Datasets',
});

export const METADATA_SECTION_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.metadataSectionTitle',
  {
    defaultMessage: 'Dataset metadata',
  }
);

export const EXAMPLES_SECTION_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.examplesSectionTitle',
  {
    defaultMessage: 'Examples',
  }
);

export const RUNS_SECTION_TITLE = i18n.translate('xpack.evals.datasetDetail.runsSectionTitle', {
  defaultMessage: 'Runs',
});

export const METADATA_DESCRIPTION_LABEL = i18n.translate(
  'xpack.evals.datasetDetail.metadataDescriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const METADATA_CREATED_AT_LABEL = i18n.translate(
  'xpack.evals.datasetDetail.metadataCreatedAtLabel',
  {
    defaultMessage: 'Created at',
  }
);

export const METADATA_UPDATED_AT_LABEL = i18n.translate(
  'xpack.evals.datasetDetail.metadataUpdatedAtLabel',
  {
    defaultMessage: 'Updated at',
  }
);

export const EDIT_METADATA_BUTTON = i18n.translate('xpack.evals.datasetDetail.editMetadataButton', {
  defaultMessage: 'Edit metadata',
});

export const ADD_EXAMPLE_BUTTON = i18n.translate('xpack.evals.datasetDetail.addExampleButton', {
  defaultMessage: 'Add example',
});

export const COLUMN_EXAMPLE_ID = i18n.translate('xpack.evals.datasetDetail.columns.exampleId', {
  defaultMessage: 'Example ID',
});

export const COLUMN_INPUT = i18n.translate('xpack.evals.datasetDetail.columns.input', {
  defaultMessage: 'Input',
});

export const COLUMN_OUTPUT = i18n.translate('xpack.evals.datasetDetail.columns.output', {
  defaultMessage: 'Output',
});

export const COLUMN_METADATA = i18n.translate('xpack.evals.datasetDetail.columns.metadata', {
  defaultMessage: 'Metadata',
});

export const COLUMN_UPDATED_AT = i18n.translate('xpack.evals.datasetDetail.columns.updatedAt', {
  defaultMessage: 'Updated at',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.evals.datasetDetail.columns.actions', {
  defaultMessage: 'Actions',
});

export const COLUMN_RUN_ID = i18n.translate('xpack.evals.datasetDetail.runsColumns.runId', {
  defaultMessage: 'Run ID',
});

export const COLUMN_RUN_TIMESTAMP = i18n.translate(
  'xpack.evals.datasetDetail.runsColumns.timestamp',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_RUN_SUITE = i18n.translate('xpack.evals.datasetDetail.runsColumns.suite', {
  defaultMessage: 'Suite',
});

export const COLUMN_RUN_TASK_MODEL = i18n.translate(
  'xpack.evals.datasetDetail.runsColumns.taskModel',
  {
    defaultMessage: 'Task model',
  }
);

export const COLUMN_RUN_EVALUATOR_MODEL = i18n.translate(
  'xpack.evals.datasetDetail.runsColumns.evaluatorModel',
  {
    defaultMessage: 'Evaluator model',
  }
);

export const EDIT_EXAMPLE_ACTION = i18n.translate('xpack.evals.datasetDetail.editExampleAction', {
  defaultMessage: 'Edit',
});

export const DELETE_EXAMPLE_ACTION = i18n.translate(
  'xpack.evals.datasetDetail.deleteExampleAction',
  {
    defaultMessage: 'Delete',
  }
);

export const CONFIRM_DELETE_EXAMPLE_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.confirmDeleteExampleTitle',
  {
    defaultMessage: 'Delete example',
  }
);

export const CONFIRM_DELETE_EXAMPLE_BODY = i18n.translate(
  'xpack.evals.datasetDetail.confirmDeleteExampleBody',
  {
    defaultMessage: 'This action cannot be undone.',
  }
);

export const MODAL_CANCEL_BUTTON = i18n.translate('xpack.evals.datasetDetail.modalCancelButton', {
  defaultMessage: 'Cancel',
});

export const MODAL_SAVE_BUTTON = i18n.translate('xpack.evals.datasetDetail.modalSaveButton', {
  defaultMessage: 'Save',
});

export const MODAL_DELETE_BUTTON = i18n.translate('xpack.evals.datasetDetail.modalDeleteButton', {
  defaultMessage: 'Delete',
});

export const EDIT_METADATA_MODAL_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.editMetadataModalTitle',
  {
    defaultMessage: 'Edit dataset metadata',
  }
);

export const ADD_EXAMPLE_MODAL_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.addExampleModalTitle',
  {
    defaultMessage: 'Add example',
  }
);

export const EDIT_EXAMPLE_MODAL_TITLE = i18n.translate(
  'xpack.evals.datasetDetail.editExampleModalTitle',
  {
    defaultMessage: 'Edit example',
  }
);

export const JSON_INPUT_LABEL = i18n.translate('xpack.evals.datasetDetail.jsonInputLabel', {
  defaultMessage: 'Input JSON object',
});

export const JSON_OUTPUT_LABEL = i18n.translate('xpack.evals.datasetDetail.jsonOutputLabel', {
  defaultMessage: 'Output JSON object',
});

export const JSON_METADATA_LABEL = i18n.translate('xpack.evals.datasetDetail.jsonMetadataLabel', {
  defaultMessage: 'Metadata JSON object',
});

export const JSON_PARSE_ERROR_PREFIX = i18n.translate(
  'xpack.evals.datasetDetail.jsonParseErrorPrefix',
  {
    defaultMessage: 'Invalid JSON payload.',
  }
);

export const EXAMPLES_EMPTY_MESSAGE = i18n.translate(
  'xpack.evals.datasetDetail.examplesEmptyMessage',
  {
    defaultMessage: 'No examples yet.',
  }
);

export const RUNS_EMPTY_MESSAGE = i18n.translate('xpack.evals.datasetDetail.runsEmptyMessage', {
  defaultMessage: 'No runs found for this dataset.',
});

export const getPageTitle = (name: string) =>
  i18n.translate('xpack.evals.datasetDetail.pageTitle', {
    defaultMessage: 'Dataset: {name}',
    values: { name },
  });

export const getFlyoutTitle = (id: string) =>
  i18n.translate('xpack.evals.datasetDetail.flyoutTitle', {
    defaultMessage: 'Example: {id}',
    values: { id },
  });

export const EDIT_EXAMPLE_BUTTON = i18n.translate('xpack.evals.datasetDetail.editExampleButton', {
  defaultMessage: 'Edit Example',
});

export const DELETE_EXAMPLE_BUTTON = i18n.translate(
  'xpack.evals.datasetDetail.deleteExampleButton',
  {
    defaultMessage: 'Delete',
  }
);

export const FLYOUT_INPUT_SECTION = i18n.translate('xpack.evals.datasetDetail.flyoutInputSection', {
  defaultMessage: 'Input',
});

export const FLYOUT_OUTPUT_SECTION = i18n.translate(
  'xpack.evals.datasetDetail.flyoutOutputSection',
  {
    defaultMessage: 'Output',
  }
);

export const FLYOUT_METADATA_SECTION = i18n.translate(
  'xpack.evals.datasetDetail.flyoutMetadataSection',
  {
    defaultMessage: 'Metadata',
  }
);

export const FLYOUT_EXPERIMENT_RUNS_SECTION = i18n.translate(
  'xpack.evals.datasetDetail.flyoutExperimentRunsSection',
  {
    defaultMessage: 'Experiment Runs',
  }
);

export const FLYOUT_NO_EXPERIMENT_RUNS = i18n.translate(
  'xpack.evals.datasetDetail.flyoutNoExperimentRuns',
  {
    defaultMessage: 'No experiments have been run for this example.',
  }
);

export const COLUMN_EXPERIMENT_RUN_ID = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsColumns.runId',
  {
    defaultMessage: 'Run ID',
  }
);

export const COLUMN_EXPERIMENT_TIMESTAMP = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsColumns.timestamp',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_EXPERIMENT_TASK_MODEL = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsColumns.taskModel',
  {
    defaultMessage: 'Task model',
  }
);

export const COLUMN_EXPERIMENT_EVALUATOR_SCORES = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsColumns.evaluatorScores',
  {
    defaultMessage: 'Evaluator scores',
  }
);

export const COLUMN_EXPERIMENT_TRACE = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsColumns.trace',
  {
    defaultMessage: 'Trace',
  }
);

export const SCORE_NOT_AVAILABLE = i18n.translate(
  'xpack.evals.datasetDetail.experimentRunsScoreNotAvailable',
  {
    defaultMessage: 'N/A',
  }
);

export const getExperimentRunsLoadError = (error: string) =>
  i18n.translate('xpack.evals.datasetDetail.experimentRunsLoadError', {
    defaultMessage: 'Failed to load experiment runs: {error}',
    values: { error },
  });

export const getTraceFlyoutTitle = (traceId: string) =>
  i18n.translate('xpack.evals.datasetDetail.traceFlyoutTitle', {
    defaultMessage: 'Trace waterfall: {traceId}',
    values: { traceId },
  });

export const SEARCH_EXAMPLES_PLACEHOLDER = i18n.translate(
  'xpack.evals.datasetDetail.searchExamplesPlaceholder',
  {
    defaultMessage: 'Search examples by input, output, or metadata',
  }
);

export const getExamplesCountTitle = (count: number) =>
  i18n.translate('xpack.evals.datasetDetail.examplesCountTitle', {
    defaultMessage: 'Examples ({count})',
    values: { count },
  });
