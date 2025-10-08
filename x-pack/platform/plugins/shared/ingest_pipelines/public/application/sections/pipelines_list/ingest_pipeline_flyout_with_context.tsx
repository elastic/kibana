/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { AuthorizationProvider } from '@kbn/es-ui-shared-plugin/public';
import type { IngestPipelinesParams } from '../../../locator';
import { INGEST_PIPELINES_APP_LOCATOR, INGEST_PIPELINES_PAGES } from '../../../locator';
import { API_BASE_PATH } from '../../../../common/constants';
import type { Pipeline } from '../../../../common/types';
import type { IngestPipelineFlyoutWithContextProps } from './ingest_pipeline_flyout_with_context_types';

import { KibanaRenderContextProvider, KibanaContextProvider } from '../../../shared_imports';
import { PipelineDeleteModal } from './delete_modal';
import { PipelineFlyout } from './pipeline_flyout';

export const IngestPipelineFlyoutWithContext: React.FC<IngestPipelineFlyoutWithContextProps> = ({
  coreServices,
  services,
  ingestPipelineName,
  onClose,
  reload,
}) => {
  const locator = services.share.url.locators.get<IngestPipelinesParams>(
    INGEST_PIPELINES_APP_LOCATOR
  );

  const createPipeline = useCallback(
    (name: string) => {
      locator?.navigate({ page: INGEST_PIPELINES_PAGES.CREATE, pipelineId: name });
    },
    [locator]
  );

  const editPipeline = useCallback(
    (name: string) => {
      locator?.navigate({ page: INGEST_PIPELINES_PAGES.EDIT, pipelineId: name });
    },
    [locator]
  );

  const clonePipeline = useCallback(
    (name: string) => {
      locator?.navigate({ page: INGEST_PIPELINES_PAGES.CLONE, pipelineId: name });
    },
    [locator]
  );

  const [pipelinesToDelete, setPipelinesToDelete] = useState<Pipeline[]>([]);

  return (
    <KibanaRenderContextProvider {...coreServices}>
      <AuthorizationProvider
        privilegesEndpoint={`${API_BASE_PATH}/privileges/ingest_pipelines`}
        httpClient={coreServices.http}
      >
        <KibanaContextProvider services={services}>
          <PipelineFlyout
            ingestPipeline={ingestPipelineName}
            onClose={onClose}
            onCreateClick={createPipeline}
            onEditClick={editPipeline}
            onCloneClick={clonePipeline}
            onDeleteClick={(pipelines) => setPipelinesToDelete(pipelines)}
          />
          {pipelinesToDelete?.length > 0 ? (
            <PipelineDeleteModal
              callback={() => {
                onClose();
                reload();
                setPipelinesToDelete([]);
              }}
              pipelinesToDelete={pipelinesToDelete}
            />
          ) : null}
        </KibanaContextProvider>
      </AuthorizationProvider>
    </KibanaRenderContextProvider>
  );
};
