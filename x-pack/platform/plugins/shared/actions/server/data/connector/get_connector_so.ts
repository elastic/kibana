/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetConnectorSoResult, GetConnectorSoParams } from './types';
import { RawAction } from '../../types';

export const getConnectorSo = async ({
  unsecuredSavedObjectsClient,
  id,
}: GetConnectorSoParams): Promise<GetConnectorSoResult> => {
  return unsecuredSavedObjectsClient.get<RawAction>('action', id);
};
