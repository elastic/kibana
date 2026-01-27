/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { Plugin } from './plugin';
import type { StreamsPluginSetup, StreamsPluginStart } from './types';

export type { StreamsPluginSetup, StreamsPluginStart };

export {
  STREAMS_API_PRIVILEGES,
  STREAMS_UI_PRIVILEGES,
  MAX_STREAM_NAME_LENGTH,
} from '../common/constants';

export {
  excludeFrozenQuery,
  kqlQuery,
  rangeQuery,
  isKqlQueryValid,
  buildEsqlFilter,
} from '../common/query_helpers';

export const plugin: PluginInitializer<StreamsPluginSetup, StreamsPluginStart> = (
  context: PluginInitializerContext
) => {
  return new Plugin(context);
};
