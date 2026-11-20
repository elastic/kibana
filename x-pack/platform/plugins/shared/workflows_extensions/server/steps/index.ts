/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import {
  dataAggregateStepDefinition,
  dataConcatStepDefinition,
  dataDedupeStepDefinition,
  dataFilterStepDefinition,
  dataFindStepDefinition,
  dataMapStepDefinition,
  dataParseJsonStepDefinition,
  dataRegexExtractStepDefinition,
  dataRegexReplaceStepDefinition,
  dataStringifyJsonStepDefinition,
} from './data';
import {
  createRemoteHostDownloadFileStepDefinition,
  createRemoteHostRunCommandStepDefinition,
  createRemoteHostUploadFileStepDefinition,
} from './remote_host';
import { getLastRunStepDefinition } from './workflow';
import type { ServerStepRegistry } from '../step_registry/step_registry';

export const registerInternalStepDefinitions = (
  serverStepRegistry: ServerStepRegistry,
  { getActionsStart }: { getActionsStart: () => ActionsPluginStartContract | undefined }
) => {
  serverStepRegistry.register(dataMapStepDefinition);
  serverStepRegistry.register(dataDedupeStepDefinition);
  serverStepRegistry.register(dataFilterStepDefinition);
  serverStepRegistry.register(dataFindStepDefinition);
  serverStepRegistry.register(dataRegexExtractStepDefinition);
  serverStepRegistry.register(dataRegexReplaceStepDefinition);
  serverStepRegistry.register(dataAggregateStepDefinition);
  serverStepRegistry.register(dataConcatStepDefinition);
  serverStepRegistry.register(dataParseJsonStepDefinition);
  serverStepRegistry.register(dataStringifyJsonStepDefinition);
  serverStepRegistry.register(createRemoteHostRunCommandStepDefinition({ getActionsStart }));
  serverStepRegistry.register(createRemoteHostUploadFileStepDefinition({ getActionsStart }));
  serverStepRegistry.register(createRemoteHostDownloadFileStepDefinition({ getActionsStart }));
  serverStepRegistry.register(getLastRunStepDefinition);
};
