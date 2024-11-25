/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseGenAIConnectorsResult } from '../use_genai_connectors';

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  return {
    connectors: [],
    loading: false,
    error: undefined,
    selectedConnector: 'foo',
    selectConnector: (id: string) => {},
    reloadConnectors: () => {},
  };
}
