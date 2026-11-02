/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createActorContext } from '@xstate/react';
import type { createEntityTableMachine } from './entity_table_machine';
import type { EntityTableSortDirection } from './types';

export type EntityTableMachine<TItem> = ReturnType<typeof createEntityTableMachine<TItem>>;

/**
 * Wraps `createActorContext` for an entity table machine and exposes typed
 * event senders shared by all Streams entity tables.
 */
export const createEntityTableContext = <TItem>(machine: EntityTableMachine<TItem>) => {
  const Context = createActorContext(machine);

  const useEntityTableEvents = () => {
    const service = Context.useActorRef();

    return useMemo(
      () => ({
        refresh: () => {
          service.send({ type: 'items.refresh' });
        },
        changeSearch: (query: string) => {
          service.send({ type: 'search.change', query });
        },
        changeSort: (sortField: string, sortDirection: EntityTableSortDirection) => {
          service.send({ type: 'sort.change', sortField, sortDirection });
        },
        changePage: (pageIndex: number, pageSize: number) => {
          service.send({ type: 'page.change', pageIndex, pageSize });
        },
      }),
      [service]
    );
  };

  return { Context, useEntityTableEvents };
};
