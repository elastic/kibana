/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout, EuiSplitPanel } from '@elastic/eui';
import { Location } from 'history';
import { FlyoutFooter, DetailsPanel, TreePanel, PipelineNotFoundFlyout } from './flyout_content';
import { Pipeline } from '../../../../common/types';
import { SectionLoading, useKibana } from '../../../shared_imports';

export interface Props {
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  onClose: () => void;
  embedded?: boolean;
}

const getPipelineNameFromLocation = (location: Location) => {
  const params = new URLSearchParams(location.search);
  return params.get('pipeline');
};

export const PipelineFlyout: FunctionComponent<Props> = ({
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
  embedded,
}) => {
  const {
    services: { history, api },
  } = useKibana();

  const pipelineNameFromLocation = getPipelineNameFromLocation(history.location);

  const [pipelineName, setPipelineName] = useState(pipelineNameFromLocation ?? '');
  const [treeRootStack, setTreeRootStack] = useState([pipelineNameFromLocation ?? '']);

  const { data: pipeline, isLoading, error } = api.useLoadPipeline(pipelineName);
  const { data: treeData } = api.useLoadPipelineTree(treeRootStack.at(-1));

  const pipelineTree =
    treeData?.pipelineStructureTree?.children.length > 0
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

      {error && embedded ? (
        <EuiFlyout
          onClose={onClose}
          aria-labelledby="pipelineDetailsFlyoutTitle"
          data-test-subj="pipelineDetails"
          size="m"
          maxWidth={550}
        >
          <PipelineNotFoundFlyout pipelineName={pipelineName} error={error} />
        </EuiFlyout>
      ) : (
        <EuiFlyout
          onClose={onClose}
          aria-labelledby="pipelineDetailsFlyoutTitle"
          data-test-subj="pipelineDetails"
          size="l"
          maxWidth={pipelineTree ? 1100 : 550}
        >
          <EuiSplitPanel.Outer direction="row" grow={true}>
            {pipelineTree && (
              <TreePanel
                pipelineTree={pipelineTree}
                selectedPipeline={pipelineName}
                setSelectedPipeline={setPipelineName}
                setTreeRootStack={setTreeRootStack}
                isExtension={treeRootStack.length > 1}
              />
            )}

            {error ? (
              <PipelineNotFoundFlyout pipelineName={pipelineName} onClose={onClose} error={error} />
            ) : (
              pipeline && <DetailsPanel pipeline={pipeline} />
            )}
          </EuiSplitPanel.Outer>

          {pipeline && (
            <FlyoutFooter
              pipeline={pipeline}
              onEditClick={onEditClick}
              onCloneClick={onCloneClick}
              onDeleteClick={onDeleteClick}
              onClose={onClose}
            />
          )}
        </EuiFlyout>
      )}
    </>
  );
};
