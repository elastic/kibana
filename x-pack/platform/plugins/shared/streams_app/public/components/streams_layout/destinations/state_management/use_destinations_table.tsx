/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { createEntityTableContext } from '../../entity_table';
import {
  DESTINATIONS_TABLE_DEFAULT_URL_STATE,
  type DestinationsTableServiceDeps,
  createDestinationsTableImplementations,
  destinationsTableMachine,
} from './destinations_table_machine';

const { Context: DestinationsTableContext, useEntityTableEvents } =
  createEntityTableContext(destinationsTableMachine);

export const useDestinationsTableSelector = DestinationsTableContext.useSelector;

export const useDestinationsTableEvents = useEntityTableEvents;

export const DestinationsTableProvider = ({
  children,
  core,
  urlStateStorageContainer,
  streamsRepositoryClient,
}: React.PropsWithChildren<DestinationsTableServiceDeps>) => {
  const logic = useMemo(
    () =>
      destinationsTableMachine.provide(
        createDestinationsTableImplementations({
          core,
          urlStateStorageContainer,
          streamsRepositoryClient,
        })
      ),
    [core, urlStateStorageContainer, streamsRepositoryClient]
  );

  return (
    <DestinationsTableContext.Provider
      logic={logic}
      options={{
        input: { defaultUrlState: DESTINATIONS_TABLE_DEFAULT_URL_STATE },
      }}
    >
      {children}
    </DestinationsTableContext.Provider>
  );
};
