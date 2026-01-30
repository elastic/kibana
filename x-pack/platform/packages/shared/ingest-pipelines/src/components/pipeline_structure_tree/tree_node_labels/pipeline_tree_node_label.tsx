/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface PipelineTreeNodeLabelProps {
  pipelineName: string;
  isManaged: boolean;
  isDeprecated: boolean;
  isSelected?: boolean;
  onClick: () => void;
  level: number; // 0-based level in the tree
}

const MAX_PIPELINE_NAME_LENGTH = 40;

export const PipelineTreeNodeLabel = ({
  pipelineName,
  isManaged,
  isDeprecated,
  isSelected,
  onClick,
  level,
}: PipelineTreeNodeLabelProps) => {
  const maxCharacters = MAX_PIPELINE_NAME_LENGTH - level * 4;

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      css={{ width: '100%', minWidth: `${360 - level * 25}px`, position: 'relative' }}
      alignItems="center"
      justifyContent="center"
      data-test-subj={`pipelineTreeNode-${pipelineName}`}
      responsive={false}
    >
      <EuiFlexItem grow={true}>
        <EuiText
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClick();
          }}
          size="s"
          textAlign="left"
          data-test-subj={`pipelineTreeNode-${pipelineName}-link`}
        >
          {pipelineName.length > maxCharacters
            ? `${pipelineName.slice(0, maxCharacters)}...`
            : pipelineName}
        </EuiText>
      </EuiFlexItem>
      {(isManaged || isDeprecated) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false} alignItems="center">
            {isManaged && (
              <EuiFlexItem
                grow={false}
                data-test-subj={`pipelineTreeNode-${pipelineName}-managedIcon`}
              >
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
