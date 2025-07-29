/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTreeView, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PipelineTreeNode } from './types';
import { createTreeNodesFromPipelines } from './create_tree_nodes';
import { getStyles } from './styles';

export interface PipelineStructureTreeProps {
  pipelineTree: PipelineTreeNode;
  /**
   * Specifies whether the tree is an extension of the main tree; i.e. displayed
   * when the user clicks on the last "+X more pipelines" tree node.
   */
  isExtension: boolean;
}

/**
 * A component for a Pipeline structure tree.
 * Children pipeline nodes represent Pipeline processors that run the
 * corresponding pipelines from the children node.
 * See more at https://www.elastic.co/docs/reference/enrich-processor/pipeline-processor
 */
export const PipelineStructureTree = ({
  pipelineTree,
  isExtension,
}: PipelineStructureTreeProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getStyles(euiTheme, isExtension);

  const [selectedPipeline, setSelectedPipeline] = useState(pipelineTree.pipelineName);

  const treeNode = createTreeNodesFromPipelines(
    pipelineTree,
    selectedPipeline,
    setSelectedPipeline
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
      {isExtension && (
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" onClick={() => {}}>
            <FormattedMessage
              id="ingestPipelines.pipelineStructureTree.backToMainTreeNodeLabel"
              defaultMessage="Back to previous pipelines"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem css={{ marginLeft: isExtension ? euiTheme.size.l : '0' }}>
        <EuiTreeView items={[treeNode]} showExpansionArrows={true} css={styles} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
