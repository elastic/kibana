/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { SignificantEventsAppPlugin } from './plugin';
import type {
  SignificantEventsAppPublicSetup,
  SignificantEventsAppPublicStart,
  SignificantEventsAppSetupDependencies,
  SignificantEventsAppStartDependencies,
} from './types';

export type { SignificantEventsAppPublicSetup, SignificantEventsAppPublicStart };

export const plugin: PluginInitializer<
  SignificantEventsAppPublicSetup,
  SignificantEventsAppPublicStart,
  SignificantEventsAppSetupDependencies,
  SignificantEventsAppStartDependencies
> = () => new SignificantEventsAppPlugin();
