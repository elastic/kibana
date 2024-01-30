/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeneratorFunction, Dataset, IndexTemplateDef } from '../types';
import { FAKE_HOSTS, FAKE_LOGS, FAKE_STACK } from '../constants';

import * as fakeLogs from './fake_logs';
import * as fakeHosts from './fake_hosts';
import * as fakeStack from './fake_stack';

export const indexTemplates: Record<Dataset, IndexTemplateDef[]> = {
  [FAKE_HOSTS]: [fakeHosts.indexTemplate],
  [FAKE_LOGS]: [fakeLogs.indexTemplate],
  [FAKE_STACK]: fakeStack.indexTemplate,
};

export const generateEvents: Record<Dataset, GeneratorFunction> = {
  [FAKE_HOSTS]: fakeHosts.generateEvent,
  [FAKE_LOGS]: fakeLogs.generateEvent,
  [FAKE_STACK]: fakeStack.generteEvent,
};

export const kibanaAssets: Record<Dataset, string[]> = {
  [FAKE_HOSTS]: [],
  [FAKE_LOGS]: [],
  [FAKE_STACK]: fakeStack.kibanaAssets,
};
