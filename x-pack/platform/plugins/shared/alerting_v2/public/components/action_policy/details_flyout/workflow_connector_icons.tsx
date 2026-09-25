/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';
import { getBaseConnectorType, TypeIcon } from '@kbn/workflows-ui';
import React from 'react';

const MAX_VISIBLE_CONNECTOR_ICONS = 4;

// Flow-control, trigger, and built-in step base types that are not external connectors.
// Excluded so the icon row shows only services the workflow communicates with.
const STRUCTURAL_BASE_TYPES = new Set([
  'if',
  'foreach',
  'while',
  'parallel',
  'switch',
  'merge',
  'wait',
  'waitForInput',
  'waitForApproval',
  'workflow',
  'manual',
  'alert',
  'scheduled',
  'data',
  'console',
]);

/** Distinct base connector types used by a workflow definition, in first-seen order. */
export const getWorkflowConnectorTypes = (
  definition: WorkflowYaml | null | undefined
): string[] => {
  if (definition == null || !Array.isArray(definition.steps)) {
    return [];
  }
  // Malformed nesting can make collectAllSteps throw, so guard the whole extraction.
  try {
    const allSteps = collectAllSteps(definition.steps);
    const bases = allSteps
      .filter((step) => step?.type)
      .map((step) => getBaseConnectorType(step.type))
      .filter((base) => !STRUCTURAL_BASE_TYPES.has(base));
    return [...new Set(bases)];
  } catch {
    return [];
  }
};

interface WorkflowConnectorIconsProps {
  types: string[];
}

/** Renders a deduplicated row of connector-type icons for a workflow definition. */
export const WorkflowConnectorIcons = ({ types }: WorkflowConnectorIconsProps) => {
  if (types.length === 0) {
    return null;
  }
  const visible = types.slice(0, MAX_VISIBLE_CONNECTOR_ICONS);
  const hidden = types.slice(MAX_VISIBLE_CONNECTOR_ICONS);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj="actionPolicyDestinationConnectorIcons"
    >
      {visible.map((type) => (
        <EuiFlexItem grow={false} key={`connector-${type}`}>
          <TypeIcon type={type} kind="step" size="m" aria-label={type} />
        </EuiFlexItem>
      ))}
      {hidden.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={hidden.join(', ')}>
            <EuiText size="xs" color="subdued" tabIndex={0}>
              {`+${hidden.length}`}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
