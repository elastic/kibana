/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FunctionComponent } from 'react';
import React, { useState, useEffect } from 'react';

import { EuiFlyout, EuiSplitPanel, useIsWithinBreakpoints } from '@elastic/eui';
import { DetailsPanel, TreePanel, NotFoundPanel } from './flyout_content';
import type { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';

export interface Props {
  ingestPipeline: string;
  onClose: () => void;
  onCreateClick: (pipelineName: string) => void;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
}

const DETAILS_VIEW = 1;
const TREE_VIEW = 2;

export const PipelineFlyout: FunctionComponent<Props> = ({
  ingestPipeline,
  onClose,
  onCreateClick,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const {
    services: { api },
  } = useKibana();

  const [pipelineName, setPipelineName] = useState(ingestPipeline);
  const [treeRootStack, setTreeRootStack] = useState([ingestPipeline]);

  useEffect(() => {
    if (treeRootStack.length > 0) {
      setPipelineName(treeRootStack.at(-1)!);
    }
  }, [treeRootStack]);

  const { data: pipeline, isLoading, error } = api.useLoadPipeline(pipelineName);
  const { data: treeData } = api.useLoadPipelineTree(treeRootStack.at(-1) ?? '');

  const isResponsiveFlyout = useIsWithinBreakpoints(['xs', 's', 'm']);
  const [responsiveFlyoutContent, setResponsiveFlyoutContent] = useState<
    typeof DETAILS_VIEW | typeof TREE_VIEW
  >(DETAILS_VIEW);

  const pipelineTree =
    treeData?.pipelineStructureTree?.children && treeData.pipelineStructureTree.children.length > 0
      ? treeData.pipelineStructureTree
      : undefined;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      data-test-subj="pipelineDetails"
      size={isResponsiveFlyout ? 'm' : 'l'}
      maxWidth={pipelineTree && !isResponsiveFlyout ? 1000 : 460}
    >
      <EuiSplitPanel.Outer
        direction="row"
        grow={true}
        responsive={false}
        borderRadius="none"
        hasShadow={false}
      >
        {pipelineTree && (!isResponsiveFlyout || responsiveFlyoutContent === TREE_VIEW) && (
          <TreePanel
            pipelineTree={pipelineTree}
            selectedPipeline={isResponsiveFlyout ? undefined : pipelineName}
            clickTreeNode={(name) => {
              setPipelineName(name);
              if (isResponsiveFlyout) {
                setResponsiveFlyoutContent(DETAILS_VIEW);
              }
            }}
            setTreeRootStack={setTreeRootStack}
            isExtension={treeRootStack.length > 1}
          />
        )}

        {(!isResponsiveFlyout || responsiveFlyoutContent === DETAILS_VIEW) &&
          (error && !isLoading ? (
            <NotFoundPanel
              pipelineName={pipelineName}
              onCreatePipeline={() => onCreateClick(pipelineName)}
              error={error}
              displayWarning={pipelineName !== ingestPipeline}
            />
          ) : (
            pipeline && (
              <DetailsPanel
                pipeline={pipeline}
                isLoading={isLoading}
                onEditClick={onEditClick}
                onCloneClick={onCloneClick}
                onDeleteClick={onDeleteClick}
                renderActions={!error}
                renderViewTreeButton={
                  isResponsiveFlyout && responsiveFlyoutContent === DETAILS_VIEW
                }
                onViewTreeClick={() => setResponsiveFlyoutContent(TREE_VIEW)}
              />
            )
          ))}
      </EuiSplitPanel.Outer>
    </EuiFlyout>
  );
};
