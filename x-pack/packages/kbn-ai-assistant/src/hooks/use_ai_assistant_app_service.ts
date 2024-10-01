/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { AIAssistantAppServiceContext } from '../context/ai_assistant_app_service_provider';

export function useAIAssistantAppService() {
  const services = useContext(AIAssistantAppServiceContext);

  if (!services) {
    throw new Error(
      'AIAssistantAppServiceContext not set. Did you wrap your component in `AIAssistantAppServiceProvider`?'
    );
  }

  return services;
}
