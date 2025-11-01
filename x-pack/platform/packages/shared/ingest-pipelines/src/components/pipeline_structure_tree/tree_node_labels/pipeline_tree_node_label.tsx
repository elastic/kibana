/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface PipelineTreeNodeLabelProps {
  pipelineName: string;
  isManaged: boolean;
  isDeprecated: boolean;
  isSelected?: boolean;
  onClick: () => void;
}

const MAX_PIPELINE_NAME_LENGTH = 40;

export const PipelineTreeNodeLabel = ({
  pipelineName,
  isManaged,
  isDeprecated,
  isSelected,
  onClick,
}: PipelineTreeNodeLabelProps) => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      css={{ width: '360px' }}
      alignItems="center"
      data-test-subj={`pipelineTreeNode-${pipelineName}`}
      responsive={false}
    >
      <EuiFlexItem grow={true}>
        <EuiLink
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClick();
          }}
          data-test-subj={`pipelineTreeNode-${pipelineName}-link`}
        >
          {pipelineName.length > MAX_PIPELINE_NAME_LENGTH
            ? `${pipelineName.slice(0, MAX_PIPELINE_NAME_LENGTH)}...`
            : pipelineName}
        </EuiLink>
      </EuiFlexItem>
      {isManaged && (
        <EuiFlexItem grow={false} data-test-subj={`pipelineTreeNode-${pipelineName}-managedIcon`}>
          <EuiIconTip
            content={i18n.translate(
              'ingestPipelines.pipelineStructureTree.treeNodeManagedTooltip',
              {
                defaultMessage: 'Managed',
              }
            )}
            type="lock"
            color={isSelected ? 'primary' : 'subdued'}
          />
        </EuiFlexItem>
      )}
      {isDeprecated && (
        <EuiFlexItem
          grow={false}
          data-test-subj={`pipelineTreeNode-${pipelineName}-deprecatedIcon`}
        >
          <EuiIconTip
            content={i18n.translate(
              'ingestPipelines.pipelineStructureTree.treeNodeDeprecatedTooltip',
              {
                defaultMessage: 'Deprecated',
              }
            )}
            type="warning"
            color={isSelected ? 'primary' : 'subdued'}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
