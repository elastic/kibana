/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading, useKibana } from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';
import { PipelineDetailsFlyout } from './details_flyout';
import { PipelineNotFoundFlyout } from './not_found_flyout';

export interface Props {
  pipeline: string | string[] | null | undefined;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: Pipeline[]) => void;
  onClose: () => void;
}

export const PipelineFlyout: FunctionComponent<Props> = ({
  pipeline,
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const { services } = useKibana();
  const pipelineName = pipeline && typeof pipeline === 'string' ? pipeline : '';
  const { data, isLoading, error } = services.api.useLoadPipeline(pipelineName);

  return (
    <>
      {isLoading && (
        <SectionLoading>
          <FormattedMessage
            id="xpack.ingestPipelines.list.pipelineDetails.loading"
            defaultMessage="Loading pipeline…"
          />
        </SectionLoading>
      )}

      {error && (
        <PipelineNotFoundFlyout pipelineName={pipelineName} onClose={onClose} error={error} />
      )}

      {data && (
        <PipelineDetailsFlyout
          pipeline={data}
          onClose={onClose}
          onEditClick={onEditClick}
          onCloneClick={onCloneClick}
          onDeleteClick={onDeleteClick}
        />
      )}
    </>
  );
};
