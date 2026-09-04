/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useKbnUrlStateStorageFromRouterContext } from '../../../util/kbn_url_state_context';
import { DestinationsTable } from './destinations_table';
import { DestinationsTableProvider } from './state_management/use_destinations_table';

export const DestinationsTab = () => {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  return (
    <DestinationsTableProvider
      core={core}
      urlStateStorageContainer={urlStateStorageContainer}
      streamsRepositoryClient={streamsRepositoryClient}
    >
      <DestinationsTable />
    </DestinationsTableProvider>
  );
};
