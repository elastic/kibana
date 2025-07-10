/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate5/react';
import { DataSourceActorRef, DataSourceActorSnapshot } from './data_source_state_machine';

export function useDataSourceSelector<T>(
  actorRef: DataSourceActorRef,
  selector: (snapshot: DataSourceActorSnapshot) => T
): T {
  return useSelector(actorRef, selector);
}
