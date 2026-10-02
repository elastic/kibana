/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationSourceType } from '@kbn/agent-builder-common';
import type { OriginAdapter } from './types';
import { slackAdapter } from './slack_adapter';

const originAdapters: ReadonlyMap<ConversationSourceType, OriginAdapter> = new Map<
  ConversationSourceType,
  OriginAdapter
>([[slackAdapter.type, slackAdapter]]);

export const getOriginAdapter = (type: ConversationSourceType): OriginAdapter | undefined =>
  originAdapters.get(type);
