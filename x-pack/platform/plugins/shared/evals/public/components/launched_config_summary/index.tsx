/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiText,
  type EuiDescriptionListProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LaunchedExperimentConfig } from '../../../common/experiments/run_experiment';

const SECTION_CONFIGURATION = i18n.translate('xpack.evals.experimentDetail.section.configuration', {
  defaultMessage: 'Configuration',
});
const CONFIG_NAME = i18n.translate('xpack.evals.experimentDetail.config.name', {
  defaultMessage: 'Name',
});
const CONFIG_TARGET = i18n.translate('xpack.evals.experimentDetail.config.target', {
  defaultMessage: 'What to evaluate',
});
const CONFIG_AGENT = i18n.translate('xpack.evals.experimentDetail.config.agent', {
  defaultMessage: 'Agent ID',
});
const CONFIG_TOOL = i18n.translate('xpack.evals.experimentDetail.config.tool', {
  defaultMessage: 'Tool ID',
});
const CONFIG_MODELS = i18n.translate('xpack.evals.experimentDetail.config.models', {
  defaultMessage: 'Model connector(s)',
});
const CONFIG_DATASETS = i18n.translate('xpack.evals.experimentDetail.config.datasets', {
  defaultMessage: 'Dataset(s)',
});
const CONFIG_EVALUATORS = i18n.translate('xpack.evals.experimentDetail.config.evaluators', {
  defaultMessage: 'Evaluators',
});
const CONFIG_REPETITIONS = i18n.translate('xpack.evals.experimentDetail.config.repetitions', {
  defaultMessage: 'Repetitions',
});
const CONFIG_CONCURRENCY = i18n.translate('xpack.evals.experimentDetail.config.concurrency', {
  defaultMessage: 'Concurrency',
});

/** Read-only summary of the submitted form, shown while a launched run is in flight. */
export const LaunchedConfigSummary: React.FC<{ config: LaunchedExperimentConfig }> = ({
  config,
}) => {
  const items: EuiDescriptionListProps['listItems'] = [];
  if (config.name) {
    items.push({ title: CONFIG_NAME, description: config.name });
  }
  items.push({ title: CONFIG_TARGET, description: config.target_label });
  if (config.agent_id) {
    items.push({ title: CONFIG_AGENT, description: config.agent_id });
  }
  if (config.tool_id) {
    items.push({ title: CONFIG_TOOL, description: config.tool_id });
  }
  if (config.connector_names.length > 0) {
    items.push({ title: CONFIG_MODELS, description: config.connector_names.join(', ') });
  }
  if (config.dataset_names.length > 0) {
    items.push({ title: CONFIG_DATASETS, description: config.dataset_names.join(', ') });
  }
  if (config.evaluator_names.length > 0) {
    items.push({ title: CONFIG_EVALUATORS, description: config.evaluator_names.join(', ') });
  }
  if (typeof config.repetitions === 'number') {
    items.push({ title: CONFIG_REPETITIONS, description: String(config.repetitions) });
  }
  if (typeof config.concurrency === 'number') {
    items.push({ title: CONFIG_CONCURRENCY, description: String(config.concurrency) });
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj="evalsLaunchedConfigSummary"
    >
      <EuiText size="s">
        <h3>{SECTION_CONFIGURATION}</h3>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" compressed columnWidths={[1, 3]} listItems={items} />
    </EuiPanel>
  );
};
