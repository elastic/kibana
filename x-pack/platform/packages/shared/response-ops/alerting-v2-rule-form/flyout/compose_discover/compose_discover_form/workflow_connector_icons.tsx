/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiToolTip } from '@elastic/eui';
import { getStepIconType } from '@kbn/workflows-ui';
import React from 'react';

const MAX_VISIBLE_CONNECTOR_ICONS = 4;

interface WorkflowConnectorIconsProps {
  types: string[];
}

/**
 * Renders a deduplicated row of connector-type icons for an action policy's
 * workflow destinations.
 */
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
      data-test-subj="workflowConnectorIcons"
    >
      {visible.map((type) => (
        <EuiFlexItem grow={false} key={`connector-${type}`}>
          <EuiIconTip type={getStepIconType(type)} size="m" content={type} aria-label={type} />
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
