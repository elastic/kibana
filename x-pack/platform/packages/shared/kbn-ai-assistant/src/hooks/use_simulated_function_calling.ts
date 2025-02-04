/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiAssistantFunctionCallingMode } from '@kbn/observability-ai-assistant-plugin/public';
import { FunctionCallingMode } from '@kbn/inference-common';
import { useKibana } from './use_kibana';

export function useSimulatedFunctionCalling() {
  const {
    services: { uiSettings },
  } = useKibana();

  const functionCallingMode = uiSettings!.get<FunctionCallingMode>(
    aiAssistantFunctionCallingMode,
    'auto'
  );

  const simulatedFunctionCallingEnabled = functionCallingMode === 'simulated';

  return { simulatedFunctionCallingEnabled };
}
