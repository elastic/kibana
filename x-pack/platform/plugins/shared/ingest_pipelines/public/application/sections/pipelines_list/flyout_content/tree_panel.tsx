/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiSplitPanel, EuiTitle, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import { PipelineStructureTree } from '@kbn/ingest-pipelines-shared';
import React, { useCallback } from 'react';
import { useKibana } from '../../../../shared_imports';

interface Props {
  pipelineTree: PipelineTreeNode;
  setTreeRootStack: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPipeline: string | undefined;
  clickTreeNode: (name: string) => void;
  isExtension: boolean;
}

export const TreePanel = React.memo(
  ({ pipelineTree, selectedPipeline, clickTreeNode, setTreeRootStack, isExtension }: Props) => {
    const {
      services: { documentation },
    } = useKibana();

    const pushTreeStack = useCallback(
      (name: string) => {
        clickTreeNode(name);
        setTreeRootStack((prevStack: string[]) => [...prevStack, name]);
      },
      [clickTreeNode, setTreeRootStack]
    );

    const popTreeStack = useCallback(() => {
      setTreeRootStack((prevStack: string[]) => {
        if (prevStack.length <= 1) return prevStack; // can't pop the last one
        return prevStack.slice(0, -1);
      });
    }, [setTreeRootStack]);

    return (
      <EuiSplitPanel.Inner
        color="subdued"
        data-test-subj="pipelineTreePanel"
        style={{ overflowY: 'auto' }}
      >
        <EuiTitle id="pipelineTreeTitle">
          <h2>
            {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.pipelineTree.title', {
              defaultMessage: 'Ingest pipeline hierarchy',
            })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="m" />

        <FormattedMessage
          id="xpack.ingestPipelines.list.pipelineDetails.pipelineTree.description"
          defaultMessage="A tree visualization of your ingest pipeline, showing how {pipelineProcessorsLink} are invoking other pipelines"
          values={{
            pipelineProcessorsLink: (
              <EuiLink href={documentation.getDocLinks()?.links.ingest.pipeline} target="_blank">
                {i18n.translate(
                  'xpack.ingestPipelines.list.pipelineDetails.pipelineTree.pipelineProcessorsDocsLink',
                  {
                    defaultMessage: 'pipeline processors',
                  }
                )}
              </EuiLink>
            ),
          }}
        />

        <EuiSpacer size="s" />

        <PipelineStructureTree
          pipelineTree={pipelineTree}
          selectedPipeline={selectedPipeline}
          clickTreeNode={clickTreeNode}
          isExtension={isExtension}
          clickMorePipelines={(name: string) => pushTreeStack(name)}
          goBack={popTreeStack}
        />
      </EuiSplitPanel.Inner>
    );
  }
);
