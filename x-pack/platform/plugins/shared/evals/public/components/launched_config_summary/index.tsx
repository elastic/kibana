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
import type { LaunchedExperimentConfig } from '../../../common/experiments/run_experiment';
import {
  SECTION_CONFIGURATION,
  CONFIG_NAME,
  CONFIG_TARGET,
  CONFIG_AGENT,
  CONFIG_MODELS,
  CONFIG_DATASETS,
  CONFIG_EVALUATORS,
  CONFIG_JUDGE_MODEL,
  CONFIG_JUDGE_MODELS,
  CONFIG_REPETITIONS,
  CONFIG_CONCURRENCY,
} from './translations';

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
  if (config.connector_names.length > 0) {
    items.push({ title: CONFIG_MODELS, description: config.connector_names.join(', ') });
  }
  if (config.dataset_names.length > 0) {
    items.push({ title: CONFIG_DATASETS, description: config.dataset_names.join(', ') });
  }
  if (config.evaluator_names.length > 0) {
    items.push({ title: CONFIG_EVALUATORS, description: config.evaluator_names.join(', ') });
  }
  // Evaluators can each judge with their own connector, so name them individually once
  // they disagree; a shared judge reads better as a single value.
  const judges = config.evaluator_judges ?? [];
  const distinctJudgeLabels = Array.from(new Set(judges.map(({ judge_label: label }) => label)));
  if (distinctJudgeLabels.length === 1) {
    items.push({ title: CONFIG_JUDGE_MODEL, description: distinctJudgeLabels[0] });
  } else if (distinctJudgeLabels.length > 1) {
    items.push({
      title: CONFIG_JUDGE_MODELS,
      description: judges
        .map(({ evaluator_name: name, judge_label: label }) => `${name}: ${label}`)
        .join(', '),
    });
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
