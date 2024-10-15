/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useObservable } from 'react-use/lib';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

export const useScope = () => {
  const service = useAIAssistantAppService();
  const scope = useObservable(service.scope$);
  return scope || 'all';
};
