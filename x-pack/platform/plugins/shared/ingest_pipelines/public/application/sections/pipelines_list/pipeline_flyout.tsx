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
import { SectionLoading, useKibana } from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';
import { PipelineDetailsFlyout } from './details_flyout';
import { PipelineNotFoundFlyout } from './not_found_flyout';

export interface Props {
  location: Location;
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
  locaiton,
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
  embedded,
}) => {
  const { services } = useKibana();

  const [treeSelectedPipeline, setTreeSelectedPipeline] = useState('');

  const pipelineNameFromLocation = getPipelineNameFromLocation(location);
  const pipelineName =
    pipelineNameFromLocation && typeof pipelineNameFromLocation === 'string'
      ? pipelineNameFromLocation
      : '';
  const { data, isLoading, error } = services.api.useLoadPipeline(pipelineName);
  const [treeRootStack, setTreeRootStack] = useState([pipelineName]);

  const pushTreeStack = (name: string) => {
    setTreeRootStack([...treeRootStack, name]);
    // TODO: Add to route
  };

  const popTreeStack = () => {
    setTreeRootStack(treeRootStack.slice(1));
  };

  // const { data: treeData } = services.api.useLoadPipelineTree(pipeline.name);
  const treeData = {
    pipelineName: 'logs_kubernetes.container_logs-1.80.2',
    isManaged: true,
    isDeprecated: true,
    children: [],
  };
  // const treeData = {
  //   pipelineName: 'logs_kubernetes.container_logs-1.80.2',
  //   isManaged: true,
  //   isDeprecated: true,
  //   children: [
  //     {
  //       pipelineName: 'global@custom',
  //       isManaged: true,
  //       isDeprecated: true,
  //       children: [
  //         {
  //           pipelineName: 'pipeline-level-3',
  //           isManaged: false,
  //           isDeprecated: false,
  //           children: [
  //             {
  //               pipelineName: 'pipeline-level-4',
  //               isManaged: false,
  //               isDeprecated: true,
  //               children: [
  //                 {
  //                   pipelineName: 'pipeline-level-5',
  //                   isManaged: true,
  //                   isDeprecated: false,
  //                   children: [
  //                     {
  //                       // This node shouldn't be displayed as it is on level 6
  //                       pipelineName: 'pipeline-level-6',
  //                       isManaged: true,
  //                       isDeprecated: false,
  //                       children: [],
  //                     },
  //                   ],
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     {
  //       pipelineName: 'logs@custom',
  //       isManaged: false,
  //       isDeprecated: true,
  //       children: [],
  //     },
  //     {
  //       pipelineName: 'logs_kubernetes.container_logs-default',
  //       isManaged: true,
  //       isDeprecated: false,
  //       children: [],
  //     },
  //     {
  //       pipelineName: 'pipeline-level-2',
  //       isManaged: true,
  //       isDeprecated: false,
  //       children: [],
  //     },
  //   ],
  // };

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
          pipelineTree={treeData.children.length > 0 ? treeData : undefined}
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
