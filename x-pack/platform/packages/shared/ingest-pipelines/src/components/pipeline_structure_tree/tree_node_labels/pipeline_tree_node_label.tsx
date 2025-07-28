/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface PipelineTreeNodeLabelProps {
  pipelineName: string;
  isManaged: boolean;
  isDeprecated: boolean;
  setSelected: () => void;
}

export const PipelineTreeNodeLabel = ({
  pipelineName,
  isManaged,
  isDeprecated,
  setSelected,
}: PipelineTreeNodeLabelProps) => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="none"
      css={{ width: '350px' }}
      alignItems="center"
      data-test-subj={`pipelineTreeNode-${pipelineName}`}
    >
      <EuiFlexItem grow={8}>
        <EuiLink
          color="text"
          onClick={setSelected}
          data-test-subj={`pipelineTreeNodeLink-${pipelineName}`}
        >
          {pipelineName}
        </EuiLink>
      </EuiFlexItem>
      {isManaged && (
        <EuiFlexItem grow={true} data-test-subj={`pipelineTreeNode-${pipelineName}-managedIcon`}>
          <EuiIconTip
            content={i18n.translate(
              'ingestPipelines.pipelineStructureTree.treeNodeManagedTooltip',
              {
                defaultMessage: 'Managed',
              }
            )}
            type="lock"
          />
        </EuiFlexItem>
      )}
      {isDeprecated && (
        <EuiFlexItem grow={true} data-test-subj={`pipelineTreeNode-${pipelineName}-deprecatedIcon`}>
          <EuiIconTip
            content={i18n.translate(
              'ingestPipelines.pipelineStructureTree.treeNodeDeprecatedTooltip',
              {
                defaultMessage: 'Deprecated',
              }
            )}
            type="warning"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
