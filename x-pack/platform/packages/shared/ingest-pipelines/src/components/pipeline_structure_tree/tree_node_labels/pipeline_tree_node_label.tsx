/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';

interface PipelineTreeNodeLabelProps {
  pipelineName: string;
  isManaged: boolean;
  isDeprecated: boolean;
  isSelected: boolean;
}

export const PipelineTreeNodeLabel = ({
  pipelineName,
  isManaged,
  isDeprecated,
  isSelected,
}: PipelineTreeNodeLabelProps) => {
  const { euiTheme } = useEuiTheme();
  
  const textStyles = css`
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.link};
  `;
  
  const iconColor = isSelected ? euiTheme.colors.primary : 'subdued';
  
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      css={{ width: '100%' }}
      alignItems="center"
      data-test-subj={`pipelineTreeNode-${pipelineName}`}
      responsive={false}
    >
      <EuiFlexItem
        grow={(10 - Number(isDeprecated) - Number(isManaged)) as EuiFlexItemProps['grow']}
        css={textStyles}
      >
        {pipelineName}
      </EuiFlexItem>
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
            color={iconColor}
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
            color={iconColor}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
