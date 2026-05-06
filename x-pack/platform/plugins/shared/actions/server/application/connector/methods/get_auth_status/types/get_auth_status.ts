/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorAuthStatusMap } from '@kbn/actions-types';

import type { ActionsClientContext } from '../../../../../actions_client';

export interface GetAuthStatusParams {
  context: ActionsClientContext;
}

export type GetAuthStatusResult = ConnectorAuthStatusMap;
