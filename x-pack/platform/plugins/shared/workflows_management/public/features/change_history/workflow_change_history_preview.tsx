/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { getWorkflowYamlFromSnapshot } from './get_workflow_yaml_from_snapshot';
import { WorkflowChangeHistoryMonacoPreview } from './workflow_change_history_monaco_preview';

const getYamlFromChange = (change: Parameters<ChangeHistoryPreviewRenderFn>[0]['change']): string =>
  getWorkflowYamlFromSnapshot(change.snapshot);

export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({
  change,
  compareSpec,
  diffTelemetry,
}) => {
  if (!compareSpec) {
    return <WorkflowChangeHistoryMonacoPreview targetYaml={getYamlFromChange(change)} />;
  }

  const baselineYaml = getYamlFromChange(compareSpec.baseline);
  const targetYaml = getYamlFromChange(compareSpec.target);

  // Monaco diff: original (baseline) → modified (target), same as `git diff baseline target`.
  return (
    <WorkflowChangeHistoryMonacoPreview
      baselineYaml={baselineYaml}
      targetYaml={targetYaml}
      diffTelemetry={diffTelemetry}
      compareSpec={compareSpec}
    />
  );
};
