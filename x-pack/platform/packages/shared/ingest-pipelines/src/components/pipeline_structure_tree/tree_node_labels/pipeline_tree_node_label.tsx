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
  isExisting: boolean;
  isManaged: boolean;
  isDeprecated: boolean;
  setSelected: () => void;
}

export const PipelineTreeNodeLabel = ({
  pipelineName,
  isExisting,
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
      <EuiFlexItem grow={7 + (isExisting + !isDeprecated + !isManaged)}>
        <EuiLink
          color="text"
          onClick={setSelected}
          data-test-subj={`pipelineTreeNodeLink-${pipelineName}`}
        >
          {pipelineName}
        </EuiLink>
      </EuiFlexItem>
      {!isExisting && (
        <EuiFlexItem
          grow={1}
          data-test-subj={`pipelineTreeNode-${pipelineName}-nonexistingIcon`}
        >
          <EuiIconTip
            content={i18n.translate(
              'ingestPipelines.pipelineStructureTree.treeNodeNonexistingTooltip',
              {
                defaultMessage: 'Pipeline does not exist',
              }
            )}
            type="error"
          />
        </EuiFlexItem>
      )}
      {isManaged && (
        <EuiFlexItem grow={1} data-test-subj={`pipelineTreeNode-${pipelineName}-managedIcon`}>
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
        <EuiFlexItem grow={1} data-test-subj={`pipelineTreeNode-${pipelineName}-deprecatedIcon`}>
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
