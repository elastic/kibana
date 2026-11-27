/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { getLastRunStepDefinition } from './workflow';
import type { ServerStepRegistry } from '../step_registry/step_registry';

export const registerInternalStepDefinitions = (serverStepRegistry: ServerStepRegistry) => {
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
  serverStepRegistry.register(getLastRunStepDefinition);
};
