/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationOriginType } from '@kbn/agent-builder-common';
import type { OriginAdapter } from './types';
import { slackAdapter } from './slack_adapter';

const originAdapters: ReadonlyMap<ConversationOriginType, OriginAdapter> = new Map<
  ConversationOriginType,
  OriginAdapter
>([[slackAdapter.type, slackAdapter]]);

export const getOriginAdapter = (type: ConversationOriginType): OriginAdapter | undefined =>
  originAdapters.get(type);
