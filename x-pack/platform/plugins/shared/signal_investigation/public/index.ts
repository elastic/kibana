/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import type { SignalInvestigationPublicSetup, SignalInvestigationPublicStart } from './plugin';
import { SignalInvestigationPublicPlugin } from './plugin';

export type { SignalInvestigationPublicSetup, SignalInvestigationPublicStart };

export const plugin: PluginInitializer<
  SignalInvestigationPublicSetup,
  SignalInvestigationPublicStart
> = (context) => new SignalInvestigationPublicPlugin(context);
