/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SECTION_CONFIGURATION = i18n.translate(
  'xpack.evals.experimentDetail.section.configuration',
  {
    defaultMessage: 'Configuration',
  }
);

export const CONFIG_NAME = i18n.translate('xpack.evals.experimentDetail.config.name', {
  defaultMessage: 'Name',
});

export const CONFIG_TARGET = i18n.translate('xpack.evals.experimentDetail.config.target', {
  defaultMessage: 'What to evaluate',
});

export const CONFIG_AGENT = i18n.translate('xpack.evals.experimentDetail.config.agent', {
  defaultMessage: 'Agent ID',
});

export const CONFIG_MODELS = i18n.translate('xpack.evals.experimentDetail.config.models', {
  defaultMessage: 'Model connector(s)',
});

export const CONFIG_DATASETS = i18n.translate('xpack.evals.experimentDetail.config.datasets', {
  defaultMessage: 'Dataset(s)',
});

export const CONFIG_EVALUATORS = i18n.translate('xpack.evals.experimentDetail.config.evaluators', {
  defaultMessage: 'Evaluators',
});

export const CONFIG_JUDGE_MODEL = i18n.translate('xpack.evals.experimentDetail.config.judgeModel', {
  defaultMessage: 'Judge connector',
});

export const CONFIG_JUDGE_MODELS = i18n.translate(
  'xpack.evals.experimentDetail.config.judgeModels',
  {
    defaultMessage: 'Judge connectors',
  }
);

export const CONFIG_REPETITIONS = i18n.translate(
  'xpack.evals.experimentDetail.config.repetitions',
  {
    defaultMessage: 'Repetitions',
  }
);

export const CONFIG_CONCURRENCY = i18n.translate(
  'xpack.evals.experimentDetail.config.concurrency',
  {
    defaultMessage: 'Concurrency',
  }
);
