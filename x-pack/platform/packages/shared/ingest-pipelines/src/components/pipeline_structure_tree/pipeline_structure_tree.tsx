/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiTreeView, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PipelineTreeNode } from './types';
import { createTreeNodesFromPipelines } from './create_tree_nodes';
import { getStyles } from './styles';

export interface PipelineStructureTreeProps {
  pipelineTree: PipelineTreeNode;
  selectedPipeline: string | undefined;
  /**
   * Specifies whether the tree is an extension of the main tree; i.e. displayed
   * when the user clicks on the last "+X more pipelines" tree node.
   */
  isExtension: boolean;
  clickTreeNode: (name: string) => void;
  clickMorePipelines: (name: string) => void;
  goBack: () => void;
}

/**
 * A component for a Pipeline structure tree.
 * Children pipeline nodes represent Pipeline processors that run the
 * corresponding pipelines from the children node.
 * See more at https://www.elastic.co/docs/reference/enrich-processor/pipeline-processor
 */
export const PipelineStructureTree = React.memo(
  ({
    pipelineTree,
    selectedPipeline,
    isExtension,
    clickTreeNode,
    clickMorePipelines,
    goBack,
  }: PipelineStructureTreeProps) => {
    const { euiTheme } = useEuiTheme();
    const styles = getStyles(euiTheme);

    const treeNode = createTreeNodesFromPipelines(
      pipelineTree,
      selectedPipeline,
      clickTreeNode,
      clickMorePipelines
    );

    return (
      <>
        {isExtension && (
          <EuiButtonEmpty iconType="arrowLeft" onClick={goBack}>
            <FormattedMessage
              id="ingestPipelines.pipelineStructureTree.backToMainTreeNodeLabel"
              defaultMessage="Back to previous pipelines"
            />
          </EuiButtonEmpty>
        )}
        <EuiTreeView
          items={[treeNode]}
          showExpansionArrows={true}
          css={styles}
          aria-label={i18n.translate('ingestPipelines.pipelineStructureTree.treeAriaLabel', {
            defaultMessage: 'Pipeline structure',
          })}
        />
      </>
    );
  }
);
