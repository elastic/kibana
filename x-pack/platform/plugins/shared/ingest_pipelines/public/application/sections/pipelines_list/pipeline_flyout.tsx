/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FunctionComponent } from 'react';
import React, { useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { 
  EuiFlyout, 
  EuiFlyoutBody, 
  EuiFlyoutFooter,
  useIsWithinBreakpoints,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FlyoutFooter as FlyoutFooterContent, DetailsPanel, TreePanel, NotFoundPanel } from './flyout_content';
import type { Pipeline } from '../../../../common/types';
import { SectionLoading, useKibana } from '../../../shared_imports';

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

  const { euiTheme } = useEuiTheme();

  const flyoutStyles = css`
    display: flex;
    flex-direction: row;
    height: 100%;
  `;

  const treePanelStyles = css`
    width: 460px;
    padding: ${euiTheme.size.xl};
    overflow-y: auto;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-right: ${isResponsiveFlyout ? 'none' : euiTheme.border.thin};
  `;

  const detailsPanelWrapperStyles = css`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  `;

  const detailsPanelStyles = css`
    padding: ${euiTheme.size.xl};
    overflow-y: auto;
  `;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      data-test-subj="pipelineDetails"
      maxWidth={pipelineTree && !isResponsiveFlyout ? 1000 : 560}
      ownFocus={false}
      paddingSize="none"
    >
      <EuiFlyoutBody css={flyoutStyles}>
        {pipelineTree && (!isResponsiveFlyout || responsiveFlyoutContent === TREE_VIEW) && (
          <div css={treePanelStyles}>
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
          </div>
        )}

        {(!isResponsiveFlyout || responsiveFlyoutContent === DETAILS_VIEW) && (
          <div css={detailsPanelWrapperStyles}>
            <div css={detailsPanelStyles}>
              {isLoading ? (
                <SectionLoading>
                  <FormattedMessage
                    id="xpack.ingestPipelines.list.pipelineDetails.loading"
                    defaultMessage="Loading pipeline…"
                  />
                </SectionLoading>
              ) : error ? (
                <NotFoundPanel
                  pipelineName={pipelineName}
                  onCreatePipeline={() => onCreateClick(pipelineName)}
                  error={error}
                  displayWarning={pipelineName !== ingestPipeline}
                />
              ) : (
                pipeline && <DetailsPanel pipeline={pipeline} />
              )}
            </div>
            
            {((isResponsiveFlyout && responsiveFlyoutContent === DETAILS_VIEW) || !error) && pipeline && (
              <EuiFlyoutFooter>
                <FlyoutFooterContent
                  pipeline={pipeline}
                  onEditClick={onEditClick}
                  onCloneClick={onCloneClick}
                  onDeleteClick={onDeleteClick}
                  renderActions={!error}
                  renderViewTreeButton={isResponsiveFlyout && responsiveFlyoutContent === DETAILS_VIEW}
                  onViewTreeClick={() => setResponsiveFlyoutContent(TREE_VIEW)}
                />
              </EuiFlyoutFooter>
            )}
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
