/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

export function useGenAIConnectors() {
  const {
    services: {
      plugins: {
        start: { observabilityAIAssistant },
      },
    },
  } = useKibana();

  return observabilityAIAssistant.useGenAIConnectors();
}

export type UseGenAIConnectorsResult = ReturnType<typeof useGenAIConnectors>;
