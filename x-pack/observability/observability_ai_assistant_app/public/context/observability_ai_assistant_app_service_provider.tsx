/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ObservabilityAIAssistantAppService } from '../service/create_app_service';

export const ObservabilityAIAssistantAppServiceContext = createContext<
  ObservabilityAIAssistantAppService | undefined
>(undefined);

export const ObservabilityAIAssistantAppServiceProvider =
  ObservabilityAIAssistantAppServiceContext.Provider;
