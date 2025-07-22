/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout } from '@elastic/eui';
import { Location } from 'history';
import { SectionLoading, useKibana } from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';
import { PipelineDetailsFlyout } from './details_flyout';
import { PipelineNotFoundFlyout } from './not_found_flyout';

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

  const { data, isLoading, error } = api.useLoadPipeline(pipelineName);
  const { data: treeData } = api.useLoadPipelineTree(treeRootStack.at(-1));

  const pushTreeStack = (name: string) => {
    const params = new URLSearchParams(history.location.search);
    params.set('pipeline', name);
    history.push({
      pathname: '',
      search: params.toString(),
    });
    setPipelineName(name);
    setTreeRootStack([...treeRootStack, name]);
  };

  const popTreeStack = () => {
    treeRootStack.pop();
    const prevPipeline = treeRootStack.at(-1);
    if (prevPipeline) {
      const params = new URLSearchParams(history.location.search);
      params.set('pipeline', prevPipeline);
      history.push({
        pathname: '',
        search: params.toString(),
      });
      setPipelineName(prevPipeline);
    }
    setTreeRootStack(treeRootStack);
  };

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

      {error &&
        (embedded ? (
          <EuiFlyout
            onClose={onClose}
            aria-labelledby="pipelineDetailsFlyoutTitle"
            data-test-subj="pipelineDetails"
            size="m"
            maxWidth={550}
          >
            <PipelineNotFoundFlyout pipelineName={pipelineName} onClose={onClose} error={error} />
          </EuiFlyout>
        ) : (
          <PipelineNotFoundFlyout pipelineName={pipelineName} onClose={onClose} error={error} />
        ))}

      {data && (
        <PipelineDetailsFlyout
          pipeline={data}
          pipelineTree={
            treeData?.pipelineStructureTree?.children ? treeData.pipelineStructureTree : undefined
          }
          setSelectedPipeline={(name: string) => setPipelineName(name)}
          hasExtensionTree={treeRootStack.length > 1}
          addToTreeStack={(name: string) => pushTreeStack(name)}
          popTreeStack={popTreeStack}
          onClose={onClose}
          onEditClick={onEditClick}
          onCloneClick={onCloneClick}
          onDeleteClick={onDeleteClick}
        />
      )}
    </>
  );
};
