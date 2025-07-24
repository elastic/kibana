/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PipelineStructureTree, PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import React, { useCallback } from 'react';
import { useKibana } from '../../../../shared_imports';

interface Props {
  pipelineTree: PipelineTreeNode;
  setTreeRootStack: (newStack: string[]) => void;
  selectedPipeline: string;
  setSelectedPipeline: (name: string) => void;
  isExtension: boolean;
}

export const TreePanel = React.memo(
  ({
    pipelineTree,
    setTreeRootStack,
    selectedPipeline,
    setSelectedPipeline,
    isExtension,
  }: Props) => {
    const {
      services: { history, api },
    } = useKibana();

    const pushTreeStack = useCallback(
      (name: string) => {
        const params = new URLSearchParams(history.location.search);
        params.set('pipeline', name);
        history.push({ pathname: '', search: params.toString() });

        setSelectedPipeline(name);
        setTreeRootStack((prevStack: string[]) => [...prevStack, name]);
      },
      [history, setSelectedPipeline, setTreeRootStack]
    );

    const popTreeStack = useCallback(() => {
      setTreeRootStack((prevStack: string[]) => {
        if (prevStack.length <= 1) return prevStack; // can't pop the last one

        const newStack = prevStack.slice(0, -1);
        const prevPipeline = newStack.at(-1);

        if (prevPipeline) {
          const params = new URLSearchParams(history.location.search);
          params.set('pipeline', prevPipeline);
          history.push({ pathname: '', search: params.toString() });
          setSelectedPipeline(prevPipeline);
        }

        return newStack;
      });
    }, [history, setSelectedPipeline, setTreeRootStack]);

    return (
      <EuiSplitPanel.Inner>
        <EuiTitle id="pipelineTreeTitle" data-test-subj="pipelineTreeTitle">
          <h2>
            {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.pipelineTreeTitle', {
              defaultMessage: 'Ingest pipeline structure',
            })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <PipelineStructureTree
          pipelineTree={pipelineTree}
          selectedPipeline={selectedPipeline}
          setSelectedPipeline={setSelectedPipeline}
          isExtension={isExtension}
          clickMorePipelines={(name: string) => pushTreeStack(name)}
          goBack={popTreeStack}
        />
      </EuiSplitPanel.Inner>
    );
  }
);
