/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { ActionsClientContext } from '../actions_client';

export const resolveInboundEventsSpaceId = (context: ActionsClientContext): string =>
  context.spaceId ?? context.spaces?.getSpaceId(context.request) ?? DEFAULT_SPACE_ID;
