/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomAppPlugin } from './plugin';

export const plugin = () => new CustomAppPlugin();

export type { CustomAppPublicSetup } from './plugin';
export type {
  CustomAppCapability,
  CustomAppCapabilityViewProps,
  CustomAppQueryResult,
  CustomAppSourceState,
} from './capabilities/register_capability';

export {
  CUSTOM_APP_APPLICATION_ID,
  SAVED_APPS_API_PATH,
  SAVED_APPS_API_VERSION,
} from '../common/constants';
