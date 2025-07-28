/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout, EuiSplitPanel, useIsWithinBreakpoints } from '@elastic/eui';
import { FlyoutFooter, DetailsPanel, TreePanel, NotFoundPanel } from './flyout_content';
import { Pipeline } from '../../../../common/types';
import { SectionLoading, useKibana } from '../../../shared_imports';

export interface Props {
  pipelineNameFromLocation: string;
  onClose: () => void;
  onCreateClick: (pipelineName: string) => void;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  embedded?: boolean;
}

const DETAILS_VIEW = 1;
const TREE_VIEW = 2;

export const PipelineFlyout: FunctionComponent<Props> = ({
  pipelineNameFromLocation,
  onClose,
  onCreateClick,
  onEditClick,
  onCloneClick,
  onDeleteClick,
  embedded,
}) => {
  const {
    services: { api },
  } = useKibana();

  const [pipelineName, setPipelineName] = useState(pipelineNameFromLocation);
  const [treeRootStack, setTreeRootStack] = useState([pipelineNameFromLocation]);

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
    <>
      {!embedded && isLoading && (
        <SectionLoading>
          <FormattedMessage
            id="xpack.ingestPipelines.list.pipelineDetails.loading"
            defaultMessage="Loading pipeline…"
          />
        </SectionLoading>
      )}

      <EuiFlyout
        onClose={onClose}
        aria-labelledby="pipelineDetailsFlyoutTitle"
        data-test-subj="pipelineDetails"
        size="l"
        maxWidth={pipelineTree ? 1100 : 550}
      >
        <EuiSplitPanel.Outer direction="row" grow={true} responsive={false} borderRadius="none">
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

          {!isLoading &&
            (!isResponsiveFlyout || responsiveFlyoutContent === DETAILS_VIEW) &&
            (error ? (
              <NotFoundPanel
                pipelineName={pipelineName}
                onCreatePipeline={() => onCreateClick(pipelineName)}
                error={error}
                displayWarning={pipelineName !== pipelineNameFromLocation}
              />
            ) : (
              pipeline && <DetailsPanel pipeline={pipeline} />
            ))}
        </EuiSplitPanel.Outer>

        {((isResponsiveFlyout && responsiveFlyoutContent === DETAILS_VIEW) || !error) &&
          pipeline && (
            <FlyoutFooter
              pipeline={pipeline}
              onEditClick={onEditClick}
              onCloneClick={onCloneClick}
              onDeleteClick={onDeleteClick}
              renderActions={!error}
              renderViewTreeButton={isResponsiveFlyout}
              onViewTreeClick={() => setResponsiveFlyoutContent(TREE_VIEW)}
            />
          )}
      </EuiFlyout>
    </>
  );
};
