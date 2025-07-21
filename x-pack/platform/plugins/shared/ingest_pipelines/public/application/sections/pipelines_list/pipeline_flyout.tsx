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
import { parse } from 'query-string';
import { isEmpty } from 'lodash';
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
  const { pipeline } = parse(location.search.substring(1));
  return pipeline;
};

export const PipelineFlyout: FunctionComponent<Props> = ({
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
  embedded,
}) => {
  const { history } = useKibana().services;

  const pipelineNameFromLocation = getPipelineNameFromLocation(history.location);
  const pipelineNameNormalized =
    pipelineNameFromLocation && typeof pipelineNameFromLocation === 'string'
      ? pipelineNameFromLocation
      : '';

  const [pipelineName, setPipelineName] = useState(pipelineNameNormalized);
  const [treeRootStack, setTreeRootStack] = useState([pipelineName]);

  const { data, isLoading, error } = services.api.useLoadPipeline(pipelineName);
  const { data: treeData } = services.api.useLoadPipelineTree(pipeline.name);

  const pushTreeStack = (name: string) => {
    setTreeRootStack([...treeRootStack, name]);
    const currentSearch = history.location.search;
    const prependSearch = isEmpty(currentSearch) ? '?' : `${currentSearch}&`;
    history.push({
      pathname: '',
      search: `${prependSearch}pipeline=${encodeURIComponent(name)}`,
    });
  };

  const popTreeStack = () => {
    setTreeRootStack(treeRootStack.slice(1));
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
          pipelineTree={treeData && treeData.children.length > 0 ? treeData : undefined}
          setSelectedPipeline={(name: string) => setPipelineName(name)}
          hasExtenstionTree={treeRootStack.length > 1}
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
