/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { ItemTypeRT } from '../inventory_models/types';

const AWSAccountRT = rt.type({
  value: rt.string,
  name: rt.string,
});

export const InventoryMetaResponseRT = rt.type({
  accounts: rt.array(AWSAccountRT),
  projects: rt.array(rt.string),
  regions: rt.array(rt.string),
});

export const InventoryMetaRequestRT = rt.type({
  sourceId: rt.string,
  nodeType: ItemTypeRT,
});

export type InventoryMetaRequest = rt.TypeOf<typeof InventoryMetaRequestRT>;
export type InventoryMetaResponse = rt.TypeOf<typeof InventoryMetaResponseRT>;
export type InventoryAWSAccount = rt.TypeOf<typeof AWSAccountRT>;
