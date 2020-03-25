/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  QuerySignals,
  SignalSearchResponse,
  BasicSignals,
  SignalsIndex,
  Privilege,
} from '../types';
import { signalsMock, mockSignalIndex, mockUserPrivilege } from '../mock';

export const fetchQuerySignals = async <Hit, Aggregations>({
  query,
  signal,
}: QuerySignals): Promise<SignalSearchResponse<Hit, Aggregations>> =>
  Promise.resolve(signalsMock as SignalSearchResponse<Hit, Aggregations>);

export const getSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> =>
  Promise.resolve(mockSignalIndex);

export const getUserPrivilege = async ({ signal }: BasicSignals): Promise<Privilege> =>
  Promise.resolve(mockUserPrivilege);

export const createSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> =>
  Promise.resolve(mockSignalIndex);
